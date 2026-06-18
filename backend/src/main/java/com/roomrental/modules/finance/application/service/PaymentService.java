package com.roomrental.modules.finance.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.finance.application.dto.*;
import com.roomrental.modules.finance.application.event.PaymentReceivedEvent;
import com.roomrental.modules.finance.domain.model.Invoice;
import com.roomrental.modules.finance.domain.model.Transaction;
import com.roomrental.modules.finance.domain.model.Transaction.PaymentMethod;
import com.roomrental.modules.finance.domain.model.Transaction.TransactionStatus;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import com.roomrental.modules.finance.domain.model.Invoice;
import com.roomrental.modules.finance.domain.repository.InvoiceRepository;
import com.roomrental.modules.finance.domain.repository.ResidentBalanceRepository;
import com.roomrental.modules.finance.domain.repository.TransactionRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PaymentService {

    private final TransactionRepository transactionRepository;
    private final InvoiceRepository invoiceRepository;
    private final ContractRepository contractRepository;
    private final ResidentBalanceRepository residentBalanceRepository;
    private final ApplicationEventPublisher eventPublisher;

    public PaymentService(
            TransactionRepository transactionRepository,
            InvoiceRepository invoiceRepository,
            ContractRepository contractRepository,
            ResidentBalanceRepository residentBalanceRepository,
            ApplicationEventPublisher eventPublisher) {
        this.transactionRepository = transactionRepository;
        this.invoiceRepository = invoiceRepository;
        this.contractRepository = contractRepository;
        this.residentBalanceRepository = residentBalanceRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResult processWebhook(PaymentWebhookCommand command) {
        // Idempotency check
        if (transactionRepository.findByTransactionRef(command.transactionRef()).isPresent()) {
            throw BaseException.conflict("Transaction already processed");
        }

        // Parse invoice ID from memo. e.g. "INV-1234"
        Long invoiceId = parseInvoiceIdFromMemo(command.memo());

        Transaction tx = new Transaction();
        tx.setAmount(command.amount());
        tx.setTransactionRef(command.transactionRef());
        tx.setPaymentMethod(PaymentMethod.VIETQR);
        tx.setBankCode(command.bankCode());
        tx.setRawWebhookData(command.rawData());
        tx.setPaidAt(OffsetDateTime.now());
        tx.setCreatedAt(OffsetDateTime.now());
        // For webhook we assume system actor or tenant is determined later.
        // We'll leave tenantId null if it's a generic webhook, but here we require a tenant lookup.
        // Usually, the invoice gives the tenantId.
        
        if (invoiceId != null) {
            invoiceRepository.findById(invoiceId).ifPresentOrElse(invoice -> {
                if (invoice.isDeleted() || invoice.getStatus() == Invoice.InvoiceStatus.VOID) {
                    throw BaseException.badRequest("Cannot pay a deleted or voided invoice");
                }
                if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
                    throw BaseException.badRequest("Invoice is already paid");
                }
                
                tx.setTenantId(invoice.getTenantId());
                tx.setInvoiceId(invoiceId);
                tx.setStatus(TransactionStatus.SUCCESS);
                
                BigDecimal overpaidAmount = handleInvoicePayment(invoice, command.amount());
                tx.setOverpaidAmount(overpaidAmount);
                tx.setCreditBalanceSnapshot(getCurrentResidentBalance(invoice.getContractId()));
                
                // If overpaid, ideally add to resident balance.
            }, () -> {
                tx.setStatus(TransactionStatus.PENDING_RECONCILE);
            });
        } else {
            tx.setStatus(TransactionStatus.PENDING_RECONCILE);
        }

        Transaction saved = transactionRepository.save(tx);

        if (saved.getStatus() == TransactionStatus.SUCCESS) {
            eventPublisher.publishEvent(new PaymentReceivedEvent(
                saved.getTenantId(), SecurityUtils.isAuthenticated() ? SecurityUtils.getCurrentUserId() : null, "SYSTEM",
                saved.getId(), saved.getInvoiceId(), saved.getAmount().toPlainString()
            ));
        }

        return toResult(saved);
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResult processManualPayment(PaymentManualCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(command.invoiceId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", command.invoiceId()));

        if (invoice.isDeleted() || invoice.getStatus() == Invoice.InvoiceStatus.VOID) {
            throw BaseException.badRequest("Cannot pay a deleted or voided invoice");
        }
        if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
            throw BaseException.badRequest("Invoice is already paid");
        }

        Transaction tx = new Transaction();
        tx.setTenantId(tenantId);
        tx.setInvoiceId(invoice.getId());
        tx.setAmount(command.amount());
        tx.setTransactionRef("MANUAL-" + UUID.randomUUID().toString().substring(0, 8));
        tx.setPaymentMethod(PaymentMethod.valueOf(command.paymentMethod()));
        tx.setStatus(TransactionStatus.SUCCESS);
        tx.setPaidAt(OffsetDateTime.now());
        tx.setCreatedAt(OffsetDateTime.now());

        BigDecimal overpaidAmount = handleInvoicePayment(invoice, command.amount());
        tx.setOverpaidAmount(overpaidAmount);
        tx.setCreditBalanceSnapshot(getCurrentResidentBalance(invoice.getContractId()));

        Transaction saved = transactionRepository.save(tx);

        eventPublisher.publishEvent(new PaymentReceivedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            saved.getId(), saved.getInvoiceId(), saved.getAmount().toPlainString()
        ));

        return toResult(saved);
    }

    @Transactional(readOnly = true)
    public Page<TransactionResult> getTransactions(Pageable pageable) {
        UUID tenantId = SecurityUtils.requireTenantId();
        return transactionRepository.findByTenantId(tenantId, pageable).map(this::toResult);
    }

    @Transactional(rollbackFor = Exception.class)
    public TransactionResult reconcileTransaction(PaymentReconcileCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Transaction tx = transactionRepository.findById(command.transactionId())
            .orElseThrow(() -> BaseException.notFound("Transaction", command.transactionId()));

        if (tx.getStatus() != TransactionStatus.PENDING_RECONCILE) {
            throw BaseException.badRequest("Transaction is not pending reconciliation");
        }

        Invoice invoice = invoiceRepository.findByIdAndTenantId(command.invoiceId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", command.invoiceId()));

        if (invoice.isDeleted() || invoice.getStatus() == Invoice.InvoiceStatus.VOID) {
            throw BaseException.badRequest("Cannot pay a deleted or voided invoice");
        }
        if (invoice.getStatus() == Invoice.InvoiceStatus.PAID) {
            throw BaseException.badRequest("Invoice is already paid");
        }

        tx.setTenantId(tenantId);
        tx.setInvoiceId(invoice.getId());
        tx.setStatus(TransactionStatus.SUCCESS);

        BigDecimal overpaidAmount = handleInvoicePayment(invoice, tx.getAmount());
        tx.setOverpaidAmount(overpaidAmount);
        tx.setCreditBalanceSnapshot(getCurrentResidentBalance(invoice.getContractId()));
        Transaction saved = transactionRepository.save(tx);

        eventPublisher.publishEvent(new PaymentReceivedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            saved.getId(), saved.getInvoiceId(), saved.getAmount().toPlainString()
        ));

        return toResult(saved);
    }

    private Long parseInvoiceIdFromMemo(String memo) {
        if (memo == null) return null;
        Pattern pattern = Pattern.compile("INV-(\\d+)");
        Matcher matcher = pattern.matcher(memo.toUpperCase());
        if (matcher.find()) {
            return Long.parseLong(matcher.group(1));
        }
        return null;
    }

    private TransactionResult toResult(Transaction tx) {
        return new TransactionResult(
            tx.getId(),
            tx.getInvoiceId(),
            tx.getAmount(),
            tx.getOverpaidAmount(),
            tx.getCreditBalanceSnapshot() != null ? tx.getCreditBalanceSnapshot() : BigDecimal.ZERO,
            tx.getTransactionRef(),
            tx.getPaymentMethod() != null ? tx.getPaymentMethod().name() : null,
            tx.getBankCode(),
            tx.getStatus() != null ? tx.getStatus().name() : null,
            tx.getPaidAt()
        );
    }

    private BigDecimal getCurrentResidentBalance(Long contractId) {
        return contractRepository.findById(contractId)
            .map(c -> residentBalanceRepository.findById(c.getPrimaryResidentUserId())
                .map(rb -> rb.getBalance())
                .orElse(BigDecimal.ZERO))
            .orElse(BigDecimal.ZERO);
    }

    private BigDecimal handleInvoicePayment(Invoice invoice, BigDecimal amount) {
        BigDecimal overpaid = invoice.applyPayment(amount);
        invoiceRepository.save(invoice);
        
        if (overpaid.compareTo(BigDecimal.ZERO) > 0) {
            contractRepository.findByIdAndTenantId(invoice.getContractId(), invoice.getTenantId())
                .ifPresent(contract -> {
                    UUID residentId = contract.getPrimaryResidentUserId();
                    com.roomrental.modules.finance.domain.model.ResidentBalance residentBalance = residentBalanceRepository.findById(residentId)
                        .orElseGet(() -> {
                            com.roomrental.modules.finance.domain.model.ResidentBalance rb = new com.roomrental.modules.finance.domain.model.ResidentBalance();
                            rb.setResidentUserId(residentId);
                            return rb;
                        });
                    residentBalance.addBalance(overpaid);
                    residentBalanceRepository.save(residentBalance);
                });
        }
        return overpaid;
    }
}

