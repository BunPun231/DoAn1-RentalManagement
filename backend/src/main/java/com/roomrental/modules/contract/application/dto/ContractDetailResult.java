package com.roomrental.modules.contract.application.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Detailed contract result for UC65.
 */
public record ContractDetailResult(
        Long id,
        String tenantId,
        Long roomId,
        String primaryResidentUserId,
        BigDecimal rentPrice,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal depositAmount,
        String depositStatus,
        String status,
        String billingCycle,
        LocalDate intendedMoveOutDate,
        String pdfUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        List<String> residentUserIds,
        List<ContractServiceItemResult> serviceItems,
        List<ContractAppendixResult> appendixes
) {
}
