package com.roomrental.modules.service.application.dto;

import java.util.List;

public record ServiceAssignCommand(
    List<Long> roomIds
) {}
