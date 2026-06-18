package com.roomrental.modules.service.application.dto;

public record ServiceUpdateCommand(
        String name,
        String chargeType,
        String unit,
        Boolean mandatory
) {
}
