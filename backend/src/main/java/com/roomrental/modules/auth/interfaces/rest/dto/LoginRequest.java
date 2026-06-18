package com.roomrental.modules.auth.interfaces.rest.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for user login (UC02).
 * Identity can be either phone number or email.
 */
public record LoginRequest(
        @NotBlank(message = "Phone or email is required")
        String identity,

        @NotBlank(message = "Password is required")
        String password
) {
}
