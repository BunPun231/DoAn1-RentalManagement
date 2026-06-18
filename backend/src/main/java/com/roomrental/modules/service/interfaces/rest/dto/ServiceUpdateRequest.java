package com.roomrental.modules.service.interfaces.rest.dto;

public record ServiceUpdateRequest(
        String name,
        String chargeType,
        String unit,
        Boolean mandatory
) {
}
