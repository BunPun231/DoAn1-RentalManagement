package com.roomrental.modules.finance.infrastructure.persistence;

import com.roomrental.common.entity.BaseEntity;
import com.roomrental.modules.finance.domain.model.Invoice.InvoiceStatus;
import com.roomrental.modules.finance.domain.model.Invoice.InvoiceType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity(name = "FinanceInvoiceEntity")
@Table(name = "invoices")
@Getter
@Setter
public class InvoiceEntity extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "contract_id", nullable = false)
    private Long contractId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    @Column(name = "billing_month", nullable = false)
    private LocalDate billingMonth;

    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "paid_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "balance_deduction", nullable = false, precision = 12, scale = 2)
    private BigDecimal balanceDeduction;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private InvoiceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_type", nullable = false)
    private InvoiceType invoiceType;

    @Column(name = "cancel_reason", columnDefinition = "TEXT")
    private String cancelReason;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted;

    @Column(name = "due_date")
    private LocalDate dueDate;

    // We keep details strictly fetched/managed by InvoiceDetailRepository/Adapter 
    // to avoid complex cascading in this simple architecture, or we can use OneToMany.
    // For clean architecture it's sometimes better to manage them separately.
    // We'll leave the List out of JPA mapping and handle it in the adapter.
}
