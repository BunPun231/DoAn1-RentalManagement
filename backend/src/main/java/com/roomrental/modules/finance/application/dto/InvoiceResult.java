package com.roomrental.modules.finance.application.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record InvoiceResult(
    Long id,
    Long contractId,
    Long roomId,
    LocalDate billingMonth,
    BigDecimal totalAmount,
    BigDecimal paidAmount,
    BigDecimal balanceDeduction,
    BigDecimal remainingAmount,
    String status,
    String invoiceType,
    LocalDate dueDate,
    OffsetDateTime createdAt
) {}

