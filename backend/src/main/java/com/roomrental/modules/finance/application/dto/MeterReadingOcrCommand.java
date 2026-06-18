package com.roomrental.modules.finance.application.dto;

import java.time.LocalDate;

public record MeterReadingOcrCommand(
    Long roomId,
    Long serviceUsageId,
    LocalDate billingMonth,
    byte[] imageBytes,
    String mimeType
) {}
