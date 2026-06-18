package com.roomrental.modules.motel.application.dto;

public record MotelResult(
        Long id,
        String tenantId,
        String name,
        String address,
        Integer totalFloors,
        String description
) {
}
