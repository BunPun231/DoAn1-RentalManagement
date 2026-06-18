package com.roomrental.modules.service.application.service;

import com.roomrental.common.dto.PageResponse;
import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import com.roomrental.modules.service.application.dto.ServiceCreateCommand;
import com.roomrental.modules.service.application.dto.ServiceResult;
import com.roomrental.modules.service.application.dto.ServiceTierPricingCommand;
import com.roomrental.modules.service.application.dto.ServiceTierPricingResult;
import com.roomrental.modules.service.application.dto.ServiceUpdateCommand;
import com.roomrental.modules.service.application.event.ServiceCreatedEvent;
import com.roomrental.modules.service.application.event.ServiceDeletedEvent;
import com.roomrental.modules.service.application.event.ServiceUpdatedEvent;
import com.roomrental.modules.service.domain.model.ChargeType;
import com.roomrental.modules.service.domain.model.RentalService;
import com.roomrental.modules.service.domain.model.ServicePricing;
import com.roomrental.modules.service.domain.model.ServiceTierPricing;
import com.roomrental.modules.service.domain.repository.RentalServiceRepository;
import com.roomrental.modules.service.domain.repository.ServicePricingRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Application service for Service management (UC32-UC36).
 */
@Service
public class RentalServiceService {

    private final RentalServiceRepository serviceRepository;
    private final ServicePricingRepository servicePricingRepository;
    private final MotelRepository motelRepository;
    private final ApplicationEventPublisher eventPublisher;

    public RentalServiceService(
            RentalServiceRepository serviceRepository,
            ServicePricingRepository servicePricingRepository,
            MotelRepository motelRepository,
            ApplicationEventPublisher eventPublisher) {
        this.serviceRepository = serviceRepository;
        this.servicePricingRepository = servicePricingRepository;
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

        RentalService savedService = serviceRepository.save(svc);
        upsertPricing(savedService.getId(), command.basePrice(), command.pricingTiers());
        ServiceResult result = toResult(savedService);
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

        RentalService savedService = serviceRepository.save(svc);
        upsertPricing(savedService.getId(), command.basePrice(), command.pricingTiers());
        ServiceResult result = toResult(savedService);
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
        ServicePricing pricing = servicePricingRepository.findCurrentByServiceId(svc.getId(), LocalDate.now())
                .orElse(null);
        return new ServiceResult(svc.getId(), svc.getMotelId(), svc.getName(),
                svc.getChargeType().name(), svc.getUnit(), svc.isMandatory(),
                pricing != null ? pricing.getBasePrice() : null,
                pricing != null
                        ? pricing.getTierPrices().stream().map(this::toTierResult).toList()
                        : List.of());
    }

    private void upsertPricing(Long serviceId, BigDecimal basePrice, List<ServiceTierPricingCommand> tierCommands) {
        servicePricingRepository.closeCurrentPricing(serviceId, LocalDate.now().minusDays(1));

        ServicePricing pricing = new ServicePricing();
        pricing.setServiceId(serviceId);
        pricing.setEffectiveFrom(LocalDate.now());
        pricing.setBasePrice(basePrice);

        List<ServiceTierPricing> tiers = new ArrayList<>();
        if (tierCommands != null) {
            for (ServiceTierPricingCommand command : tierCommands) {
                ServiceTierPricing tier = new ServiceTierPricing();
                tier.setTierStart(command.tierStart());
                tier.setTierEnd(command.tierEnd());
                tier.setPricePerUnit(command.pricePerUnit());
                tiers.add(tier);
            }
        }
        pricing.setTierPrices(tiers);
        servicePricingRepository.save(pricing);
    }

    private ServiceTierPricingResult toTierResult(ServiceTierPricing tier) {
        return new ServiceTierPricingResult(tier.getTierStart(), tier.getTierEnd(), tier.getPricePerUnit());
    }
}
