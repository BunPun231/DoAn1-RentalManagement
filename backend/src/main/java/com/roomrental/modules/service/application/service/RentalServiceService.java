package com.roomrental.modules.service.application.service;

import com.roomrental.common.dto.PageResponse;
import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import com.roomrental.modules.service.application.dto.ServiceCreateCommand;
import com.roomrental.modules.service.application.dto.ServiceResult;
import com.roomrental.modules.service.application.dto.ServiceUpdateCommand;
import com.roomrental.modules.service.application.event.ServiceCreatedEvent;
import com.roomrental.modules.service.application.event.ServiceDeletedEvent;
import com.roomrental.modules.service.application.event.ServiceUpdatedEvent;
import com.roomrental.modules.service.domain.model.ChargeType;
import com.roomrental.modules.service.domain.model.RentalService;
import com.roomrental.modules.service.domain.repository.RentalServiceRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Application service for Service management (UC32-UC36).
 */
@Service
public class RentalServiceService {

    private final RentalServiceRepository serviceRepository;
    private final MotelRepository motelRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RentalServiceService(RentalServiceRepository serviceRepository, MotelRepository motelRepository, ApplicationEventPublisher eventPublisher) {
        this.serviceRepository = serviceRepository;
        this.motelRepository = motelRepository;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public ServiceResult create(Long motelId, ServiceCreateCommand command) {
        requireMotel(motelId);

        if (serviceRepository.existsByMotelIdAndName(motelId, command.name())) {
            throw BaseException.conflict("Service '" + command.name() + "' already exists in this motel");
        }

        RentalService svc = new RentalService();
        svc.setMotelId(motelId);
        svc.setName(command.name());
        svc.setChargeType(parseChargeType(command.chargeType()));
        svc.setUnit(command.unit());
        svc.setMandatory(command.mandatory() != null && command.mandatory());

        ServiceResult result = toResult(serviceRepository.save(svc));
        UUID tenantId = SecurityUtils.requireTenantId();
        eventPublisher.publishEvent(new ServiceCreatedEvent(
                tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
                result.id(), result.name()));
        return result;
    }

    @Transactional(readOnly = true)
    public PageResponse<ServiceResult> list(Long motelId, Pageable pageable) {
        requireMotel(motelId);
        return PageResponse.from(serviceRepository.findByMotelId(motelId, pageable), this::toResult);
    }

    @Transactional(readOnly = true)
    public ServiceResult get(Long motelId, Long serviceId) {
        return toResult(findService(motelId, serviceId));
    }

    @Transactional
    public ServiceResult update(Long motelId, Long serviceId, ServiceUpdateCommand command) {
        RentalService svc = findService(motelId, serviceId);
        String oldName = svc.getName();

        if (command.name() != null && !command.name().isBlank()) {
            if (!command.name().equals(svc.getName()) && serviceRepository.existsByMotelIdAndName(motelId, command.name())) {
                throw BaseException.conflict("Service '" + command.name() + "' already exists");
            }
            svc.setName(command.name());
        }
        if (command.chargeType() != null) {
            svc.setChargeType(parseChargeType(command.chargeType()));
        }
        if (command.unit() != null) {
            svc.setUnit(command.unit());
        }
        if (command.mandatory() != null) {
            svc.setMandatory(command.mandatory());
        }

        ServiceResult result = toResult(serviceRepository.save(svc));
        UUID tenantId = SecurityUtils.requireTenantId();
        eventPublisher.publishEvent(new ServiceUpdatedEvent(
                tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
                result.id(), oldName, result.name()));
        return result;
    }

    @Transactional
    public void delete(Long motelId, Long serviceId) {
        RentalService svc = findService(motelId, serviceId);
        svc.setDeleted(true);
        serviceRepository.save(svc);

        UUID tenantId = SecurityUtils.requireTenantId();
        eventPublisher.publishEvent(new ServiceDeletedEvent(
                tenantId, SecurityUtils.getCurrentUserId(), SecurityUtils.getCurrentRole(),
                serviceId, svc.getName()));
    }

    private Motel requireMotel(Long motelId) {
        UUID tenantId = SecurityUtils.requireTenantId();
        return motelRepository.findByIdAndTenantId(motelId, tenantId)
                .orElseThrow(() -> BaseException.notFound("Motel", motelId));
    }

    private RentalService findService(Long motelId, Long serviceId) {
        requireMotel(motelId);
        return serviceRepository.findByIdAndMotelId(serviceId, motelId)
                .orElseThrow(() -> BaseException.notFound("Service", serviceId));
    }

    private ChargeType parseChargeType(String type) {
        try { return ChargeType.valueOf(type); }
        catch (IllegalArgumentException e) { throw BaseException.badRequest("Invalid charge type: " + type); }
    }

    private ServiceResult toResult(RentalService svc) {
        return new ServiceResult(svc.getId(), svc.getMotelId(), svc.getName(),
                svc.getChargeType().name(), svc.getUnit(), svc.isMandatory());
    }
}
