package com.roomrental.modules.core.auth.application.dto;

public record LoginCommand(
        String tenantCode,
        String email,
        String password
) {
}
