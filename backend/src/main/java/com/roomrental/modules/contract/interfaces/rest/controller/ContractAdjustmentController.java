package com.roomrental.modules.contract.interfaces.rest.controller;

import com.roomrental.common.dto.ApiResponse;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentRequest;
import com.roomrental.modules.contract.application.service.ContractAdjustmentService;
import com.roomrental.modules.contract.interfaces.rest.dto.ContractAdjustmentRequestBody;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/contracts")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Contract Adjustments", description = "Dieu chinh hop dong (UC66)")
public class ContractAdjustmentController {
    private final ContractAdjustmentService adjustmentService;

    public ContractAdjustmentController(ContractAdjustmentService adjustmentService) {
        this.adjustmentService = adjustmentService;
    }

    @PostMapping("/{contractId}/adjustments")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Void>> adjust(
            @PathVariable Long contractId,
            @Valid @RequestBody ContractAdjustmentRequestBody body
    ) {
        ContractAdjustmentRequest request = new ContractAdjustmentRequest(
                body.type(),
                body.effectiveDate(),
                body.newRentPrice(),
                body.newEndDate(),
                body.intendedMoveOutDate(),
                body.metadata()
        );
        adjustmentService.adjust(contractId, request);
        return ResponseEntity.ok(ApiResponse.ok("Contract adjusted"));
    }
}
