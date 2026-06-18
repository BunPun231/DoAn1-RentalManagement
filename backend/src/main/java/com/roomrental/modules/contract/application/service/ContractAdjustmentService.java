package com.roomrental.modules.contract.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.SecurityUtils;
import com.roomrental.modules.contract.application.adjustment.ContractAdjustmentStrategy;
import com.roomrental.modules.contract.application.adjustment.ContractAdjustmentStrategyFactory;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentRequest;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentType;
import com.roomrental.modules.contract.application.event.ContractAdjustmentEvent;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContractAdjustmentService {
    private final ContractRepository contractRepository;
    private final ContractAdjustmentStrategyFactory strategyFactory;
    private final ApplicationEventPublisher eventPublisher;

    public ContractAdjustmentService(
            ContractRepository contractRepository,
            ContractAdjustmentStrategyFactory strategyFactory,
            ApplicationEventPublisher eventPublisher
    ) {
        this.contractRepository = contractRepository;
        this.strategyFactory = strategyFactory;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public void adjust(Long contractId, ContractAdjustmentRequest request) {
        UUID tenantId = SecurityUtils.requireTenantId();
        UUID actorId = SecurityUtils.getCurrentUserId();
        Contract contract = contractRepository.findByIdAndTenantId(contractId, tenantId)
                .orElseThrow(() -> BaseException.notFound("Contract", contractId));

        if (contract.getStatus() != Contract.ContractStatus.ACTIVE) {
            throw BaseException.badRequest("Only ACTIVE contracts can be adjusted");
        }

        ContractAdjustmentType type = parseType(request.type());
        ContractAdjustmentStrategy strategy = strategyFactory.getStrategy(type);
        strategy.process(contract, request);

        contract.setUpdatedAt(LocalDateTime.now());
        contractRepository.save(contract);

        eventPublisher.publishEvent(new ContractAdjustmentEvent(
                contract.getId(),
                contract.getTenantId(),
                actorId,
                type,
                LocalDateTime.now()
        ));
    }

    private ContractAdjustmentType parseType(String type) {
        if (type == null || type.isBlank()) {
            throw BaseException.badRequest("type: required");
        }
        try {
            return ContractAdjustmentType.valueOf(type);
        } catch (IllegalArgumentException ex) {
            throw BaseException.badRequest("type: invalid value");
        }
    }
}
