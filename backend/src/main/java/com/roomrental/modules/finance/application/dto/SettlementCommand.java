package com.roomrental.modules.finance.application.dto;

import java.math.BigDecimal;
import java.util.List;

public record SettlementCommand(
    Long contractId,
    BigDecimal finalElectricReading,
    BigDecimal finalWaterReading,
    List<String> damageItems,
    List<String> damageImageUrls
) {}
