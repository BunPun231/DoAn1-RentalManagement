package com.roomrental.modules.finance.application.dto;

import java.math.BigDecimal;

public record SettlementConfirmCommand(
    Long contractId,
    BigDecimal finalElectricityIndex,
    BigDecimal finalWaterIndex,
    BigDecimal repairFees
) {}
