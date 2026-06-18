package com.roomrental.modules.contract.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.util.TenantContext;
import com.roomrental.modules.contract.application.adjustment.ContractAdjustmentStrategy;
import com.roomrental.modules.contract.application.adjustment.ContractAdjustmentStrategyFactory;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentRequest;
import com.roomrental.modules.contract.application.dto.ContractAdjustmentType;
import com.roomrental.modules.contract.domain.model.Contract;
import com.roomrental.modules.contract.domain.repository.ContractRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ContractAdjustmentService Unit Tests")
class ContractAdjustmentServiceTest {

    static {
        System.setProperty("net.bytebuddy.experimental", "true");
    }

    @Mock private ContractRepository contractRepository;
    @Mock private com.roomrental.modules.contract.domain.repository.ContractAppendixRepository appendixRepository;
    @Mock private ContractAdjustmentStrategyFactory strategyFactory;
    @Mock private ApplicationEventPublisher eventPublisher;
    @Mock private ContractAdjustmentStrategy strategy;
    @InjectMocks private ContractAdjustmentService adjustmentService;

    private UUID tenantId;
    private UUID userId;

    @BeforeEach
    void setUp() {
        tenantId = UUID.randomUUID();
        userId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId.toString());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId.toString(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_MANAGER"))));
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Test
    void adjust_invokesStrategyAndPublishesEvent() {
        Contract contract = new Contract();
        contract.setId(100L);
        contract.setTenantId(tenantId);
        contract.setStatus(Contract.ContractStatus.ACTIVE);
        when(contractRepository.findByIdAndTenantId(100L, tenantId)).thenReturn(Optional.of(contract));
        when(strategyFactory.getStrategy(ContractAdjustmentType.PRICE_CHANGE)).thenReturn(strategy);
        when(strategy.process(eq(contract), any(ContractAdjustmentRequest.class))).thenReturn(1L);
        when(appendixRepository.findByContractId(100L)).thenReturn(List.of());

        ContractAdjustmentRequest req = new ContractAdjustmentRequest(
                ContractAdjustmentType.PRICE_CHANGE.name(),
                LocalDate.now().plusDays(1), null, null, null, null
        );

        var result = adjustmentService.adjust(100L, req);

        assertThat(result).isNotNull();
        assertThat(result.contractId()).isEqualTo(100L);
        verify(strategy).process(eq(contract), any(ContractAdjustmentRequest.class));
        verify(contractRepository).save(contract);
        verify(eventPublisher).publishEvent(any(Object.class));
    }

    @Test
    void adjust_nonActive_throws() {
        Contract contract = new Contract();
        contract.setId(101L);
        contract.setTenantId(tenantId);
        contract.setStatus(Contract.ContractStatus.DRAFT);
        when(contractRepository.findByIdAndTenantId(101L, tenantId)).thenReturn(Optional.of(contract));

        ContractAdjustmentRequest req = new ContractAdjustmentRequest(
                ContractAdjustmentType.MOVE_OUT_NOTICE.name(),
                null, null, null, LocalDate.now().plusDays(5), null
        );

        assertThatThrownBy(() -> adjustmentService.adjust(101L, req)).isInstanceOf(BaseException.class);
    }
}
