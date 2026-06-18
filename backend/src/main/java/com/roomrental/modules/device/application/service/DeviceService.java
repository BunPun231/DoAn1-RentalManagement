package com.roomrental.modules.device.application.service;

import com.roomrental.common.dto.PageResponse;
import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.activity.application.dto.ActivityLogCreateCommand;
import com.roomrental.modules.activity.application.service.ActivityLogService;
import com.roomrental.modules.device.application.dto.DeviceCreateCommand;
import com.roomrental.modules.device.application.dto.DeviceResult;
import com.roomrental.modules.device.application.dto.DeviceUpdateCommand;
import com.roomrental.modules.device.domain.model.Device;
import com.roomrental.modules.device.domain.model.DeviceStatus;
import com.roomrental.modules.device.domain.repository.DeviceRepository;
import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Application service for Device management (UC40-UC48).
 */
@Service
public class DeviceService {

    private final DeviceRepository deviceRepository;
    private final MotelRepository motelRepository;
    private final ActivityLogService activityLogService;

    public DeviceService(DeviceRepository deviceRepository, MotelRepository motelRepository, ActivityLogService activityLogService) {
        this.deviceRepository = deviceRepository;
        this.motelRepository = motelRepository;
        this.activityLogService = activityLogService;
    }

    @Transactional
    public DeviceResult create(Long motelId, DeviceCreateCommand command) {
        requireMotel(motelId);

        Device device = new Device();
        device.setMotelId(motelId);
        device.setName(command.name());
        device.setBrand(command.brand());
        device.setPurchasePrice(command.purchasePrice());
        device.setPurchaseDate(command.purchaseDate());
        device.setStatus(DeviceStatus.IN_STOCK);

        DeviceResult result = toResult(deviceRepository.save(device));
        UUID tenantId = SecurityUtils.requireTenantId();
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "CREATE_DEVICE",
                "Device",
                result.id().toString(),
                null,
                result.name(),
                null
        ));
        return result;
    }

    @Transactional(readOnly = true)
    public PageResponse<DeviceResult> list(Long motelId, Pageable pageable) {
        requireMotel(motelId);
        return PageResponse.from(deviceRepository.findByMotelId(motelId, pageable), this::toResult);
    }

    @Transactional(readOnly = true)
    public DeviceResult get(Long motelId, Long deviceId) {
        return toResult(findDevice(motelId, deviceId));
    }

    @Transactional
    public DeviceResult update(Long motelId, Long deviceId, DeviceUpdateCommand command) {
        Device device = findDevice(motelId, deviceId);
        String oldName = device.getName();

        if (command.name() != null) device.setName(command.name());
        if (command.brand() != null) device.setBrand(command.brand());
        if (command.purchasePrice() != null) device.setPurchasePrice(command.purchasePrice());
        if (command.purchaseDate() != null) device.setPurchaseDate(command.purchaseDate());
        if (command.status() != null) {
            try { device.setStatus(DeviceStatus.valueOf(command.status())); }
            catch (IllegalArgumentException e) { throw BaseException.badRequest("Invalid device status: " + command.status()); }
        }

        DeviceResult result = toResult(deviceRepository.save(device));
        UUID tenantId = SecurityUtils.requireTenantId();
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "UPDATE_DEVICE",
                "Device",
                result.id().toString(),
                oldName,
                result.name(),
                null
        ));
        return result;
    }

    @Transactional
    public void delete(Long motelId, Long deviceId) {
        Device device = findDevice(motelId, deviceId);
        device.setDeleted(true);
        deviceRepository.save(device);

        UUID tenantId = SecurityUtils.requireTenantId();
        activityLogService.log(new ActivityLogCreateCommand(
                tenantId,
                SecurityUtils.getCurrentUserId(),
                SecurityUtils.getCurrentRole(),
                "DELETE_DEVICE",
                "Device",
                deviceId.toString(),
                device.getName(),
                "DELETED",
                null
        ));
    }

    private Motel requireMotel(Long motelId) {
        UUID tenantId = SecurityUtils.requireTenantId();
        return motelRepository.findByIdAndTenantId(motelId, tenantId)
                .orElseThrow(() -> BaseException.notFound("Motel", motelId));
    }

    private Device findDevice(Long motelId, Long deviceId) {
        requireMotel(motelId);
        return deviceRepository.findByIdAndMotelId(deviceId, motelId)
                .orElseThrow(() -> BaseException.notFound("Device", deviceId));
    }

    private DeviceResult toResult(Device d) {
        return new DeviceResult(d.getId(), d.getMotelId(), d.getName(), d.getBrand(),
                d.getPurchasePrice(), d.getPurchaseDate(), d.getStatus().name());
    }
}
