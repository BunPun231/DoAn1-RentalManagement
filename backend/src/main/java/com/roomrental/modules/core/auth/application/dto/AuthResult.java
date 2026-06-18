package com.roomrental.modules.core.auth.application.dto;

import java.util.UUID;

public record AuthResult(
        String accessToken,
        String tokenType,
        UUID accountId,
        UUID tenantId,
        String tenantCode,
        String role
) {
}
