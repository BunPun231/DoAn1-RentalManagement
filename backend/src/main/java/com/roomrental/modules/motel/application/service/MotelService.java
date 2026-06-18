package com.roomrental.modules.motel.application.service;

import com.roomrental.common.exception.ApiException;
import com.roomrental.common.util.TenantContext;
import com.roomrental.modules.motel.application.dto.MotelResult;
import com.roomrental.modules.motel.application.dto.MotelUpsertCommand;
import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MotelService {

    private final MotelRepository motelRepository;

    public MotelService(MotelRepository motelRepository) {
        this.motelRepository = motelRepository;
    }

    @Transactional
    public MotelResult create(MotelUpsertCommand command) {
        UUID tenantId = requireTenantId();

        Motel motel = new Motel();
        motel.setTenantId(tenantId);
        motel.setName(command.name());
        motel.setAddress(command.address());
        motel.setTotalFloors(command.totalFloors());
        motel.setDescription(command.description());

        return toResult(motelRepository.save(motel));
    }

    @Transactional(readOnly = true)
    public List<MotelResult> list() {
        UUID tenantId = requireTenantId();
        return motelRepository.findByTenantIdAndDeletedFalse(tenantId).stream().map(this::toResult).toList();
    }

    @Transactional(readOnly = true)
    public MotelResult get(Long id) {
        UUID tenantId = requireTenantId();
        Motel motel = motelRepository.findByIdAndTenantIdAndDeletedFalse(id, tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MSG05", "Motel not found"));
        return toResult(motel);
    }

    @Transactional
    public MotelResult patch(Long id, MotelUpsertCommand command) {
        UUID tenantId = requireTenantId();
        Motel motel = motelRepository.findByIdAndTenantIdAndDeletedFalse(id, tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MSG05", "Motel not found"));

        // Validate and update only fields that are provided (not null)
        if (command.name() != null && !command.name().isBlank()) {
            motel.setName(command.name());
        } else if (command.name() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MSG01", "name: must not be blank");
        }
        
        if (command.address() != null && !command.address().isBlank()) {
            motel.setAddress(command.address());
        } else if (command.address() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MSG01", "address: must not be blank");
        }
        
        if (command.totalFloors() != null) {
            if (command.totalFloors() < 1) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "MSG01", "totalFloors: must be at least 1");
            }
            motel.setTotalFloors(command.totalFloors());
        }
        
        if (command.description() != null) {
            motel.setDescription(command.description());
        }

        return toResult(motelRepository.save(motel));
    }

    @Transactional
    public void delete(Long id) {
        UUID tenantId = requireTenantId();
        Motel motel = motelRepository.findByIdAndTenantIdAndDeletedFalse(id, tenantId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MSG05", "Motel not found"));
        motel.setDeleted(true);
        motelRepository.save(motel);
    }

    private UUID requireTenantId() {
        String tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null || tenantId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "MSG06", "Missing tenant context");
        }
        return UUID.fromString(tenantId);
    }

    private MotelResult toResult(Motel motel) {
        return new MotelResult(
                motel.getId(),
                motel.getTenantId().toString(),
                motel.getName(),
                motel.getAddress(),
                motel.getTotalFloors(),
                motel.getDescription()
        );
    }
}
