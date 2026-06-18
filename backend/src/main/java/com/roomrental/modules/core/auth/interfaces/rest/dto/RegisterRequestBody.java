package com.roomrental.modules.core.auth.interfaces.rest.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequestBody(
        @NotBlank String tenantName,
        @NotBlank String fullName,
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 64) String password
) {
}
