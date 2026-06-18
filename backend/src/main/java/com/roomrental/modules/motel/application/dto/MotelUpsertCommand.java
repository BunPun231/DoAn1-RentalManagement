package com.roomrental.modules.motel.application.dto;

public record MotelUpsertCommand(
        String name,
        String address,
        Integer totalFloors,
        String description
) {
}
