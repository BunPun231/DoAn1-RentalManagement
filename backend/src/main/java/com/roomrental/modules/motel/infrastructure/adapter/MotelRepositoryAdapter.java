package com.roomrental.modules.motel.infrastructure.adapter;

import com.roomrental.modules.motel.domain.model.Motel;
import com.roomrental.modules.motel.domain.repository.MotelRepository;
import com.roomrental.modules.motel.infrastructure.mapper.MotelPersistenceMapper;
import com.roomrental.modules.motel.infrastructure.persistence.MotelEntity;
import com.roomrental.modules.motel.infrastructure.persistence.MotelJpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Repository;

@Repository
public class MotelRepositoryAdapter implements MotelRepository {

    private final MotelJpaRepository jpaRepository;
    private final MotelPersistenceMapper mapper;

    public MotelRepositoryAdapter(MotelJpaRepository jpaRepository, MotelPersistenceMapper mapper) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Motel save(Motel motel) {
        MotelEntity entity = mapper.toEntity(motel);
        MotelEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public List<Motel> findByTenantIdAndDeletedFalse(UUID tenantId) {
        return jpaRepository.findByTenantIdAndDeletedFalse(tenantId).stream().map(mapper::toDomain).collect(Collectors.toList());
    }

    @Override
    public Optional<Motel> findByIdAndTenantIdAndDeletedFalse(Long id, UUID tenantId) {
        return jpaRepository.findByIdAndTenantIdAndDeletedFalse(id, tenantId).map(mapper::toDomain);
    }
}
