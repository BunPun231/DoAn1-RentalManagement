package com.roomrental.modules.finance.interfaces.rest.dto;

import java.math.BigDecimal;

public record SettlementConfirmRequest(
    BigDecimal finalElectricityIndex,
    BigDecimal finalWaterIndex,
    BigDecimal repairFees
) {}
