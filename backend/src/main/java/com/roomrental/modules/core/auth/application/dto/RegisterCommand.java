package com.roomrental.modules.core.auth.application.dto;

public record RegisterCommand(
        String tenantName,
        String fullName,
        String email,
        String password
) {
}
