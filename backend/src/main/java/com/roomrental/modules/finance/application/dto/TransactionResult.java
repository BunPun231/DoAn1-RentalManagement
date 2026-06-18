package com.roomrental.modules.finance.application.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record TransactionResult(
    Long id,
    Long invoiceId,
    BigDecimal amount,
    String transactionRef,
    String paymentMethod,
    String bankCode,
    String status,
    OffsetDateTime paidAt
) {}

