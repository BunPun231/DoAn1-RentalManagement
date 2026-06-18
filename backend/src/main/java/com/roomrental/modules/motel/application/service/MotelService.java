package com.roomrental.modules.motel.application.service;

import com.roomrental.common.dto.PageResponse;
import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.activity.application.dto.ActivityLogCreateCommand;
import com.roomrental.modules.activity.application.service.ActivityLogService;
import com.roomrental.modules.motel.application.dto.MotelResult;
import com.roomrental.modules.motel.application.dto.MotelUpsertCommand;
import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Application service for Motel management (UC20-UC25).
 */
@Service
public class MotelService {

    private final MotelRepository motelRepository;
    private final ActivityLogService activityLogService;

    public MotelService(MotelRepository motelRepository, ActivityLogService activityLogService) {
        this.motelRepository = motelRepository;
        this.activityLogService = activityLogService;
    }

    /**
     * UC20: Create a new motel.
     */
    @Transactional
    public MotelResult create(MotelUpsertCommand command) {
        UUID tenantId = SecurityUtils.requireTenantId();

        Motel motel = new Motel();
        motel.setTenantId(tenantId);
        motel.setName(command.name());
        motel.setAddress(command.address());
        motel.setTotalFloors(command.totalFloors());
        motel.setDescription(command.description());

        MotelResult result = toResult(motelRepository.save(motel));
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "CREATE_MOTEL",
                "Motel",
                result.id().toString(),
                null,
                result.name(),
                null
        ));
        return result;
    }

    /**
     * UC21: List motels with pagination.
     */
    @Transactional(readOnly = true)
    public PageResponse<MotelResult> list(Pageable pageable) {
        UUID tenantId = SecurityUtils.requireTenantId();
        Page<Motel> page = motelRepository.findByTenantId(tenantId, pageable);
        return PageResponse.from(page, this::toResult);
    }

    /**
     * UC22: Get motel detail.
     */
    @Transactional(readOnly = true)
    public MotelResult get(Long id) {
        return toResult(findMotel(id));
    }

    /**
     * UC23: Update motel info (partial update).
     */
    @Transactional
    public MotelResult update(Long id, MotelUpsertCommand command) {
        Motel motel = findMotel(id);
        String oldName = motel.getName();

        if (command.name() != null && !command.name().isBlank()) {
            motel.setName(command.name());
        }
        if (command.address() != null && !command.address().isBlank()) {
            motel.setAddress(command.address());
        }
        if (command.totalFloors() != null) {
            if (command.totalFloors() < 1) {
                throw BaseException.badRequest("totalFloors must be at least 1");
            }
            motel.setTotalFloors(command.totalFloors());
        }
        if (command.description() != null) {
            motel.setDescription(command.description());
        }

        MotelResult result = toResult(motelRepository.save(motel));
        UUID tenantId = SecurityUtils.requireTenantId();
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "UPDATE_MOTEL",
                "Motel",
                result.id().toString(),
                oldName,
                result.name(),
                null
        ));
        return result;
    }

    /**
     * UC25: Soft-delete motel.
     */
    @Transactional
    public void delete(Long id) {
        Motel motel = findMotel(id);
        motel.setDeleted(true);
        motelRepository.save(motel);

        UUID tenantId = SecurityUtils.requireTenantId();
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "DELETE_MOTEL",
                "Motel",
                id.toString(),
                motel.getName(),
                "DELETED",
                null
        ));
    }

    private Motel findMotel(Long id) {
        UUID tenantId = SecurityUtils.requireTenantId();
        return motelRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> BaseException.notFound("Motel", id));
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
