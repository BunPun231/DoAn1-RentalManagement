package com.roomrental.modules.finance.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.finance.application.dto.*;
import com.roomrental.modules.finance.application.event.*;
import com.roomrental.modules.finance.application.strategy.BillingContext;
import com.roomrental.modules.finance.application.strategy.BillingStrategy;
import com.roomrental.modules.finance.application.strategy.BillingStrategyFactory;
import com.roomrental.modules.finance.domain.model.Invoice;
import com.roomrental.modules.finance.domain.model.Invoice.InvoiceStatus;
import com.roomrental.modules.finance.domain.model.InvoiceDetail;
import com.roomrental.modules.finance.domain.repository.InvoiceDetailRepository;
import com.roomrental.modules.finance.domain.repository.InvoiceRepository;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class InvoiceService {
    
    private final InvoiceRepository invoiceRepository;
    private final InvoiceDetailRepository invoiceDetailRepository;
    private final ContractRepository contractRepository;
    private final BillingStrategyFactory strategyFactory;
    private final ApplicationEventPublisher eventPublisher;

    public InvoiceService(
            InvoiceRepository invoiceRepository,
            InvoiceDetailRepository invoiceDetailRepository,
            ContractRepository contractRepository,
            BillingStrategyFactory strategyFactory,
            ApplicationEventPublisher eventPublisher) {
        this.invoiceRepository = invoiceRepository;
        this.invoiceDetailRepository = invoiceDetailRepository;
        this.contractRepository = contractRepository;
        this.strategyFactory = strategyFactory;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public List<InvoiceResult> generateForMotel(InvoiceGenerateCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        
        // Find active contracts in motel. 
        // Note: Currently contractRepository doesn't have an easy findActiveByMotelId. We just simulate.
        List<Contract> contracts = contractRepository.findByTenantId(tenantId).stream()
                .filter(c -> c.getStatus() == Contract.ContractStatus.ACTIVE)
                .filter(c -> {
                    // BR73.9: Skip if intendedMoveOutDate is in this month
                    if (c.getIntendedMoveOutDate() != null) {
                        return c.getIntendedMoveOutDate().getMonth() != command.billingMonth().getMonth();
                    }
                    return true;
                })
                .collect(Collectors.toList());

        List<InvoiceResult> results = new ArrayList<>();
        
        for (Contract contract : contracts) {
            // Check duplicate
            if (invoiceRepository.existsByContractIdAndBillingMonth(contract.getId(), command.billingMonth())) {
                continue;
            }

            Invoice invoice = new Invoice();
            invoice.setTenantId(tenantId);
            invoice.setContractId(contract.getId());
            invoice.setRoomId(contract.getRoomId());
            invoice.setBillingMonth(command.billingMonth());
            invoice.setDueDate(LocalDate.now().plusDays(5)); // default 5 days
            invoice.setCreatedAt(OffsetDateTime.now());
            invoice.setUpdatedAt(OffsetDateTime.now());
            
            // 1. Calculate Rent
            BillingStrategy rentStrategy = strategyFactory.getStrategy("FIXED", false);
            BillingContext rentContext = new BillingContext(
                null, "Tiền phòng", "FIXED", null, null, null, 1, contract.getRentPrice(), null
            );
            List<InvoiceDetail> details = new ArrayList<>(rentStrategy.calculate(rentContext));

            // 2. Fetch Services and Meter Readings (Simulated here)
            // You would loop through ContractServiceItems and generate details via strategies

            BigDecimal total = details.stream().map(InvoiceDetail::getLineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
            invoice.setTotalAmount(total);
            
            // 3. Apply auto-pay from balance if any (Simulated balance = 0)
            invoice.setBalanceDeduction(BigDecimal.ZERO);
            invoice.setPaidAmount(BigDecimal.ZERO);
            
            Invoice saved = invoiceRepository.save(invoice);
            
            for (InvoiceDetail d : details) {
                d.setInvoiceId(saved.getId());
            }
            invoiceDetailRepository.saveAll(details);
            
            eventPublisher.publishEvent(new InvoiceCreatedEvent(
                tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
                saved.getId(), saved.getTotalAmount().toPlainString()
            ));
            
            results.add(toResult(saved));
        }

        return results;
    }

    @Transactional(readOnly = true)
    public Page<InvoiceResult> list(String status, Pageable pageable) {
        UUID tenantId = SecurityUtils.requireTenantId();
        if (status != null && !status.isEmpty()) {
            return invoiceRepository.findByTenantIdAndStatus(tenantId, status, pageable).map(this::toResult);
        }
        return invoiceRepository.findByTenantId(tenantId, pageable).map(this::toResult);
    }

    @Transactional(readOnly = true)
    public InvoiceResult getDetail(Long id) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", id));
        List<InvoiceDetail> details = invoiceDetailRepository.findByInvoiceId(id);
        invoice.setDetails(details);
        return toResult(invoice);
    }

    @Transactional
    public InvoiceResult adjustInvoice(InvoiceAdjustCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(command.invoiceId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", command.invoiceId()));

        if (!invoice.canBeVoided()) {
            throw BaseException.badRequest("Only PENDING invoice can be adjusted");
        }

        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setCancelReason(command.reason());
        invoice.setUpdatedAt(OffsetDateTime.now());
        invoiceRepository.save(invoice);

        eventPublisher.publishEvent(new InvoiceCancelledEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            invoice.getId(), command.reason()
        ));

        // Re-generate logic would go here. For now returning the voided one.
        return toResult(invoice);
    }

    @Transactional
    public void deleteInvoice(Long id) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Invoice invoice = invoiceRepository.findByIdAndTenantId(id, tenantId)
            .orElseThrow(() -> BaseException.notFound("Invoice", id));

        if (!invoice.canBeDeleted()) {
            throw BaseException.badRequest("Cannot delete invoice with transactions");
        }

        invoiceRepository.softDelete(id);
        
        eventPublisher.publishEvent(new InvoiceDeletedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(), id
        ));
    }

    private InvoiceResult toResult(Invoice invoice) {
        return new InvoiceResult(
            invoice.getId(),
            invoice.getContractId(),
            invoice.getRoomId(),
            invoice.getBillingMonth(),
            invoice.getTotalAmount(),
            invoice.getPaidAmount(),
            invoice.getBalanceDeduction(),
            invoice.getRemainingAmount(),
            invoice.getStatus().name(),
            invoice.getInvoiceType().name(),
            invoice.getDueDate(),
            invoice.getCreatedAt()
        );
    }
}

