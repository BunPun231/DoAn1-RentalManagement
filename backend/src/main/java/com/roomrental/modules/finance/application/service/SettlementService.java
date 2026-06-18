package com.roomrental.modules.finance.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import com.roomrental.modules.finance.application.dto.*;
import com.roomrental.modules.finance.application.event.SettlementCompletedEvent;
import com.roomrental.modules.finance.domain.model.Invoice;
import com.roomrental.modules.finance.domain.repository.InvoiceRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class SettlementService {

    private final ContractRepository contractRepository;
    private final InvoiceRepository invoiceRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SettlementService(
            ContractRepository contractRepository,
            InvoiceRepository invoiceRepository,
            ApplicationEventPublisher eventPublisher) {
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public SettlementResult calculate(SettlementCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(command.contractId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", command.contractId()));

        // Calculate debts
        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidByContractId(contract.getId());
        BigDecimal currentDebt = unpaidInvoices.stream()
            .map(Invoice::getRemainingAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate pro-rated rent and final utilities based on final readings
        BigDecimal proRatedRent = BigDecimal.ZERO; 
        BigDecimal finalUtilities = BigDecimal.ZERO;
        
        // Calculate repair fees based on damage items
        BigDecimal repairFees = BigDecimal.ZERO; 

        BigDecimal totalDeductions = currentDebt.add(proRatedRent).add(finalUtilities).add(repairFees);
        BigDecimal deposit = contract.getDepositAmount() != null ? contract.getDepositAmount() : BigDecimal.ZERO;
        BigDecimal netAmount = deposit.subtract(totalDeductions);

        return new SettlementResult(
            contract.getId(),
            deposit,
            currentDebt,
            proRatedRent,
            finalUtilities,
            repairFees,
            netAmount,
            null
        );
    }

    @Transactional
    public void confirmRefund(Long contractId) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", contractId));

        contract.liquidate();
        contract.setUpdatedAt(java.time.LocalDateTime.now());
        contractRepository.save(contract);

        eventPublisher.publishEvent(new SettlementCompletedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            contract.getId(), "CONFIRMED"
        ));
    }

    @Transactional
    public void confirmWithBadDebt(Long contractId) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", contractId));

        contract.liquidate();
        contract.setUpdatedAt(java.time.LocalDateTime.now());
        contractRepository.save(contract);

        eventPublisher.publishEvent(new SettlementCompletedEvent(
            tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
            contract.getId(), "BAD_DEBT"
        ));
    }
}

