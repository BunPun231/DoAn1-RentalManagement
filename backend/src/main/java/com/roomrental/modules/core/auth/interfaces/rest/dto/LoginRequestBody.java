package com.roomrental.modules.core.auth.interfaces.rest.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequestBody(
        @NotBlank @Schema(example = "admin", defaultValue = "admin") String tenantCode,
        @NotBlank @Email @Schema(example = "admin@gmail.com", defaultValue = "admin@gmail.com") String email,
        @NotBlank @Schema(example = "Admin@1234", defaultValue = "Admin@1234") String password
) {
}
