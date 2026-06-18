package com.roomrental.modules.core.auth.infrastructure.adapter;

import com.roomrental.modules.core.auth.domain.model.WorkspaceTenant;
import com.roomrental.modules.core.auth.domain.repository.WorkspaceTenantRepository;
import com.roomrental.modules.core.auth.infrastructure.entity.WorkspaceTenantEntity;
import com.roomrental.modules.core.auth.infrastructure.mapper.AuthPersistenceMapper;
import com.roomrental.modules.core.auth.infrastructure.repository.WorkspaceTenantJpaRepository;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceTenantRepositoryAdapter implements WorkspaceTenantRepository {

    private final WorkspaceTenantJpaRepository workspaceTenantJpaRepository;
    private final AuthPersistenceMapper mapper;

    public WorkspaceTenantRepositoryAdapter(
            WorkspaceTenantJpaRepository workspaceTenantJpaRepository,
            AuthPersistenceMapper mapper
    ) {
        this.workspaceTenantJpaRepository = workspaceTenantJpaRepository;
        this.mapper = mapper;
    }

    @Override
    public WorkspaceTenant save(WorkspaceTenant tenant) {
        WorkspaceTenantEntity entity = mapper.toEntity(tenant);
        return mapper.fromEntity(workspaceTenantJpaRepository.save(entity));
    }

    @Override
    public Optional<WorkspaceTenant> findByCode(String code) {
        return workspaceTenantJpaRepository.findByCode(code).map(mapper::fromEntity);
    }

    @Override
    public boolean existsByCode(String code) {
        return workspaceTenantJpaRepository.existsByCode(code);
    }
}
