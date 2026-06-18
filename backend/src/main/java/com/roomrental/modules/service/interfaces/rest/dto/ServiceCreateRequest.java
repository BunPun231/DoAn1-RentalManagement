package com.roomrental.modules.service.interfaces.rest.dto;

import jakarta.validation.constraints.NotBlank;

public record ServiceCreateRequest(
        @NotBlank(message = "Service name is required")
        String name,

        @NotBlank(message = "Charge type is required")
        String chargeType,

        String unit,
        Boolean mandatory
) {
}
