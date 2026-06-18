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
    private final com.roomrental.modules.room.domain.repository.RoomRepository roomRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SettlementService(
            ContractRepository contractRepository,
            InvoiceRepository invoiceRepository,
            com.roomrental.modules.room.domain.repository.RoomRepository roomRepository,
            ApplicationEventPublisher eventPublisher) {
        this.contractRepository = contractRepository;
        this.invoiceRepository = invoiceRepository;
        this.roomRepository = roomRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public SettlementResult calculate(SettlementCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(command.contractId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", command.contractId()));

        java.time.LocalDate effectiveMoveOutDate = command.moveOutDate() != null ? command.moveOutDate() : contract.getIntendedMoveOutDate();
        if (effectiveMoveOutDate == null) {
            throw BaseException.badRequest("Move out date must be scheduled before calculation");
        }

        // Calculate debts
        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidByContractId(contract.getId());
        BigDecimal currentDebt = unpaidInvoices.stream()
            .map(Invoice::getRemainingAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calculate pro-rated rent based on final month's days
        long daysLived = effectiveMoveOutDate.getDayOfMonth();
        BigDecimal proRatedRent = contract.getRentPrice()
            .multiply(BigDecimal.valueOf(daysLived))
            .divide(BigDecimal.valueOf(30), 2, java.math.RoundingMode.HALF_UP);
        
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
    public void confirmSettlement(SettlementConfirmCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(command.contractId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", command.contractId()));

        if (contract.getIntendedMoveOutDate() == null) {
            throw BaseException.badRequest("Move out date is not scheduled");
        }

        List<Invoice> unpaidInvoices = invoiceRepository.findUnpaidByContractId(contract.getId());
        BigDecimal currentDebt = unpaidInvoices.stream()
            .map(Invoice::getRemainingAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long daysLived = contract.getIntendedMoveOutDate().getDayOfMonth();
        BigDecimal proRatedRent = contract.getRentPrice()
            .multiply(BigDecimal.valueOf(daysLived))
            .divide(BigDecimal.valueOf(30), 2, java.math.RoundingMode.HALF_UP);

        // Utilities calculation could use final indices here
        BigDecimal finalUtilities = BigDecimal.ZERO; 
        BigDecimal repairFees = command.repairFees() != null ? command.repairFees() : BigDecimal.ZERO;

        BigDecimal totalDeductions = currentDebt.add(proRatedRent).add(finalUtilities).add(repairFees);
        BigDecimal deposit = contract.getDepositAmount() != null ? contract.getDepositAmount() : BigDecimal.ZERO;
        
        Invoice invoice = new Invoice();
        invoice.setTenantId(tenantId);
        invoice.setContractId(contract.getId());
        invoice.setRoomId(contract.getRoomId());
        invoice.setBillingMonth(contract.getIntendedMoveOutDate().withDayOfMonth(1));
        invoice.setInvoiceType(Invoice.InvoiceType.SETTLEMENT);
        invoice.setTotalAmount(totalDeductions);
        invoice.setDueDate(java.time.LocalDate.now().plusDays(5));
        invoice.setCreatedAt(OffsetDateTime.now());
        invoice.setUpdatedAt(OffsetDateTime.now());

        if (deposit.compareTo(totalDeductions) >= 0) {
            invoice.setBalanceDeduction(totalDeductions);
            invoice.setPaidAmount(BigDecimal.ZERO);
            invoice.setStatus(Invoice.InvoiceStatus.PAID);
            
            contract.liquidate();
            
            // Release room
            roomRepository.findById(contract.getRoomId()).ifPresent(room -> {
                room.setStatus(com.roomrental.modules.room.domain.model.RoomStatus.EMPTY);
                room.setCurrentResidentsCount(0);
                roomRepository.save(room);
            });
            eventPublisher.publishEvent(new SettlementCompletedEvent(
                tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
                contract.getId(), "CONFIRMED"
            ));
        } else {
            invoice.setBalanceDeduction(deposit);
            invoice.setPaidAmount(BigDecimal.ZERO);
            invoice.setStatus(Invoice.InvoiceStatus.PENDING);
            contract.setStatus(Contract.ContractStatus.PENDING_LIQUIDATION);
        }
        
        invoiceRepository.save(invoice);
        contract.setUpdatedAt(java.time.LocalDateTime.now());
        contractRepository.save(contract);
    }

    @Transactional
    public void scheduleMoveOut(SettlementScheduleMoveOutCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Contract contract = contractRepository.findByIdAndTenantId(command.contractId(), tenantId)
            .orElseThrow(() -> BaseException.notFound("Contract", command.contractId()));

        if (!contract.isActive()) {
            throw BaseException.badRequest("Only active contracts can schedule move out");
        }

        contract.setIntendedMoveOutDate(command.moveOutDate());
        contract.setMoveOutReason(command.moveOutReason());
        contract.markForLiquidation();
        contract.setUpdatedAt(java.time.LocalDateTime.now());
        
        contractRepository.save(contract);
    }
}

