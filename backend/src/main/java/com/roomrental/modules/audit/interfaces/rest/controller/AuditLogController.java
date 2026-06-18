package com.roomrental.modules.audit.interfaces.rest.controller;

import com.roomrental.common.dto.ApiResponse;
import com.roomrental.modules.audit.application.dto.AuditLogFilter;
import com.roomrental.modules.audit.application.dto.AuditLogResult;
import com.roomrental.modules.audit.application.service.AuditLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit-logs")
@Tag(name = "Audit Log", description = "System-level audit logging (UC13)")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List audit logs")
    public ResponseEntity<ApiResponse<Page<AuditLogResult>>> list(
            @RequestParam(required = false) UUID actorId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime toDate,
            Pageable pageable) {

        AuditLogFilter filter = new AuditLogFilter(actorId, action, entityType, fromDate, toDate);
        Page<AuditLogResult> logs = auditLogService.findAll(filter, pageable);
        return ResponseEntity.ok(ApiResponse.ok(logs, "Success"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get audit log detail")
    public ResponseEntity<ApiResponse<AuditLogResult>> getById(@PathVariable Long id) {
        AuditLogResult result = auditLogService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(result, "Success"));
    }
}
