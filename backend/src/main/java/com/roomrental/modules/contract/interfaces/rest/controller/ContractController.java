package com.roomrental.modules.contract.interfaces.rest.controller;

import com.roomrental.common.dto.ApiResponse;
import com.roomrental.common.dto.PageResponse;
import com.roomrental.modules.contract.application.dto.ContractCreateCommand;
import com.roomrental.modules.contract.application.dto.ContractDetailResult;
import com.roomrental.modules.contract.application.dto.ContractResult;
import com.roomrental.modules.contract.application.dto.ContractServiceItemCommand;
import com.roomrental.modules.contract.application.service.ContractService;
import com.roomrental.modules.contract.interfaces.rest.dto.ContractCreateRequestBody;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller cho Contract Management.
 * Endpoints: POST, GET, PATCH, DELETE.
 */
@RestController
@RequestMapping("/api/contracts")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Contract Management", description = "Quản lý hợp đồng thuê phòng")
public class ContractController {
    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    /**
         * Tạo hợp đồng mới (DRAFT status).
     * POST /api/contracts
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ContractResult>> create(@Valid @RequestBody ContractCreateRequestBody body) {
        ContractCreateCommand command = new ContractCreateCommand(
                body.roomId(),
                body.primaryResidentUserId(),
                body.primaryResidentPhone(),
                body.primaryResidentFullName(),
                body.primaryResidentEmail(),
                body.primaryResidentIdCardNumber(),
                body.primaryResidentIdCardFrontUrl(),
                body.primaryResidentIdCardBackUrl(),
            body.rentPrice(),
                body.startDate(),
                body.endDate(),
                body.depositAmount(),
                body.depositStatus(),
            body.billingCycle(),
            body.residentUserIds(),
            body.serviceItems() != null
                ? body.serviceItems().stream()
                .map(item -> new ContractServiceItemCommand(item.serviceId(), item.quantity()))
                .toList()
                : List.of()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(contractService.create(command), "Contract created"));
    }

    /**
     * Lấy hợp đồng theo ID.
     * GET /api/contracts/{id}
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','RESIDENT')")
    public ResponseEntity<ApiResponse<ContractResult>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getById(id)));
    }

    /**
     * Chi tiết hợp đồng.
     * GET /api/contracts/{id}/detail
     */
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','RESIDENT')")
    public ResponseEntity<ApiResponse<ContractDetailResult>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.getDetail(id)));
    }

    /**
     * Lấy danh sách hợp đồng của tenant hiện tại.
     * GET /api/contracts
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ContractResult>>> list() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.listByTenant()));
    }

    /**
     * Lấy danh sách hợp đồng theo nhà trọ.
     * GET /api/contracts/motels/{motelId}
     */
    @GetMapping("/motels/{motelId}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<PageResponse<ContractResult>>> listByMotel(
            @PathVariable Long motelId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false, defaultValue = "false") boolean expiring,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @PageableDefault(size = 20) Pageable pageable) {

        if (expiring) {
            LocalDate from = fromDate != null ? fromDate : LocalDate.now();
            LocalDate to = toDate != null ? toDate : LocalDate.now().plusDays(30);
            return ResponseEntity.ok(ApiResponse.ok(
                    PageResponse.from(contractService.listExpiringByMotel(motelId, from, to, pageable))
            ));
        }

        if (status != null && !status.isBlank()) {
            return ResponseEntity.ok(ApiResponse.ok(
                    PageResponse.from(contractService.listByMotelAndStatus(motelId, status, pageable))
            ));
        }

        return ResponseEntity.ok(ApiResponse.ok(
                PageResponse.from(contractService.listByMotel(motelId, pageable))
        ));
    }

    /**
     * Lấy danh sách hợp đồng đang hiệu lực (ACTIVE).
     * GET /api/contracts/active
     */
    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<ContractResult>>> listActive() {
        return ResponseEntity.ok(ApiResponse.ok(contractService.listActiveByTenant()));
    }

    /**
     * Lấy danh sách hợp đồng của một cư dân.
     * GET /api/contracts/resident/{residentUserId}
     */
    @GetMapping("/resident/{residentUserId}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN','RESIDENT')")
    public ResponseEntity<ApiResponse<List<ContractResult>>> listByResident(@PathVariable String residentUserId) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.listByResident(residentUserId)));
    }


    /**
     * Kích hoạt hợp đồng (chuyển từ DRAFT → ACTIVE).
     * POST /api/contracts/{id}/activate
     */
    @PostMapping("/{id}/activate")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<ContractResult>> activate(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(contractService.activate(id)));
    }


    /**
     * Xuat PDF hop dong.
     * GET /api/contracts/{id}/pdf
     */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<byte[]> exportPdf(@PathVariable Long id) {
        byte[] pdf = contractService.exportPdf(id);
        String filename = "contract_" + id + "_" + LocalDate.now() + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // Contract adjustments are handled by UC66 controller.
}
