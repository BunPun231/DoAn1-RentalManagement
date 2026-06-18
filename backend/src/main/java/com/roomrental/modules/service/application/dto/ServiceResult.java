package com.roomrental.modules.service.application.dto;

public record ServiceResult(
        Long id,
        Long motelId,
        String name,
        String chargeType,
        String unit,
        boolean mandatory
) {
}
