package com.roomrental.modules.motel.interfaces.rest.controller;

import com.roomrental.modules.motel.application.dto.MotelResult;
import com.roomrental.modules.motel.application.dto.MotelUpsertCommand;
import com.roomrental.modules.motel.application.service.MotelService;
import com.roomrental.modules.motel.interfaces.rest.dto.MotelUpsertRequestBody;
import com.roomrental.modules.motel.interfaces.rest.dto.MotelPatchRequestBody;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/motels")
@SecurityRequirement(name = "bearerAuth")
public class MotelController {

    private final MotelService motelService;

    public MotelController(MotelService motelService) {
        this.motelService = motelService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<MotelResult> create(@Valid @RequestBody MotelUpsertRequestBody body) {
        return ResponseEntity.ok(motelService.create(toCommand(body)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<List<MotelResult>> list() {
        return ResponseEntity.ok(motelService.list());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<MotelResult> get(@PathVariable Long id) {
        return ResponseEntity.ok(motelService.get(id));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<MotelResult> patch(@PathVariable Long id, @RequestBody MotelPatchRequestBody body) {
        return ResponseEntity.ok(motelService.patch(id, toPatchCommand(body)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('MANAGER','ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        motelService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private MotelUpsertCommand toCommand(MotelUpsertRequestBody body) {
        return new MotelUpsertCommand(body.name(), body.address(), body.totalFloors(), body.description());
    }

    private MotelUpsertCommand toPatchCommand(MotelPatchRequestBody body) {
        return new MotelUpsertCommand(body.name(), body.address(), body.totalFloors(), body.description());
    }
}
