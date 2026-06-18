package com.roomrental.modules.finance.interfaces.rest.controller;

import com.roomrental.modules.finance.application.dto.*;
import com.roomrental.modules.finance.application.service.InvoiceService;
import com.roomrental.modules.finance.interfaces.rest.dto.InvoiceAdjustRequest;
import com.roomrental.modules.finance.interfaces.rest.dto.InvoiceGenerateRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/invoices")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Finance - Invoices", description = "UC73, UC74, UC75, UC76, UC77")
public class InvoiceController {

    private final InvoiceService service;

    public InvoiceController(InvoiceService service) {
        this.service = service;
    }

    @PostMapping("/generate")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Generate invoices for a motel (UC73)")
    public ResponseEntity<InvoiceGenerationResult> generateForMotel(@RequestBody @Valid InvoiceGenerateRequest request) {
        return ResponseEntity
                .ok(service.generateForMotel(new InvoiceGenerateCommand(request.motelId(), request.billingMonth())));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "List invoices (UC74)")
    public ResponseEntity<Page<InvoiceResult>> list(@RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(service.list(status, pageable));
    }

    @GetMapping("/me")
    @PreAuthorize("hasAnyRole('RESIDENT')")
    @Operation(summary = "List my invoices (UC74 - Tenant)")
    public ResponseEntity<Page<InvoiceResult>> getMyInvoices(@RequestParam(required = false) String status, Pageable pageable) {
        return ResponseEntity.ok(service.listMyInvoices(status, pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN', 'RESIDENT')")
    @Operation(summary = "Get invoice details (UC75)")
    public ResponseEntity<InvoiceResult> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(service.getDetail(id));
    }

    // @PostMapping("/{id}/adjust")
    // @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    // @Operation(summary = "Adjust/Void an invoice (UC76)")
    // public ResponseEntity<InvoiceResult> adjustInvoice(@PathVariable Long id,
    // @RequestBody @Valid InvoiceAdjustRequest request) {
    // InvoiceAdjustCommand cmd = new InvoiceAdjustCommand(
    // id, request.reason(), request.correctedReadings(),
    // request.customAdjustments()
    // );
    // return ResponseEntity.ok(service.adjustInvoice(cmd));
    // }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
    @Operation(summary = "Soft delete an invoice (UC77)")
    public ResponseEntity<Void> deleteInvoice(@PathVariable Long id) {
        service.deleteInvoice(id);
        return ResponseEntity.noContent().build();
    }
}
