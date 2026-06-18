package com.roomrental.modules.service.application.dto;

public record ServiceCreateCommand(
        String name,
        String chargeType,
        String unit,
        Boolean mandatory
) {
}
