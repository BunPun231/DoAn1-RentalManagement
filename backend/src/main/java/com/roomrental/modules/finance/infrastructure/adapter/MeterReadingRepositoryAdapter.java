package com.roomrental.modules.finance.infrastructure.adapter;

import com.roomrental.modules.finance.domain.model.MeterReading;
import com.roomrental.modules.finance.domain.repository.MeterReadingRepository;
import com.roomrental.modules.finance.infrastructure.mapper.MeterReadingMapper;
import com.roomrental.modules.finance.infrastructure.persistence.MeterReadingEntity;
import com.roomrental.modules.finance.infrastructure.persistence.MeterReadingJpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class MeterReadingRepositoryAdapter implements MeterReadingRepository {

    private final MeterReadingJpaRepository jpaRepository;
    private final MeterReadingMapper mapper;

    public MeterReadingRepositoryAdapter(MeterReadingJpaRepository jpaRepository, MeterReadingMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public MeterReading save(MeterReading reading) {
        MeterReadingEntity entity = mapper.toEntity(reading);
        return mapper.toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<MeterReading> findById(Long id) {
        return jpaRepository.findById(id).map(mapper::toDomain);
    }

    @Override
    public Optional<MeterReading> findByIdAndTenantId(Long id, UUID tenantId) {
        return jpaRepository.findByIdAndTenantId(id, tenantId).map(mapper::toDomain);
    }

    @Override
    public List<MeterReading> findByRoomIdAndTenantId(Long roomId, UUID tenantId) {
        return jpaRepository.findByRoomIdAndTenantId(roomId, tenantId).stream()
                .map(mapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public List<MeterReading> findByRoomIdAndBillingMonth(Long roomId, LocalDate billingMonth) {
        return jpaRepository.findByRoomIdAndBillingMonth(roomId, billingMonth).stream()
                .map(mapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public Page<MeterReading> findPendingByTenantId(UUID tenantId, Pageable pageable) {
        return jpaRepository.findByTenantIdAndStatus(tenantId, "PENDING", pageable)
                .map(mapper::toDomain);
    }

    @Override
    public List<MeterReading> findApprovedByRoomIdAndBillingMonth(Long roomId, LocalDate billingMonth) {
        return jpaRepository.findByRoomIdAndBillingMonthAndStatus(roomId, billingMonth, "APPROVED").stream()
                .map(mapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public boolean existsByServiceUsageIdAndBillingMonthAndStatus(Long serviceUsageId, LocalDate billingMonth, String status) {
        return jpaRepository.existsByServiceUsageIdAndBillingMonthAndStatus(serviceUsageId, billingMonth, status);
    }
}
