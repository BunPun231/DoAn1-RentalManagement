package com.roomrental.modules.core.auth.infrastructure.repository;

import com.roomrental.modules.core.auth.infrastructure.entity.WorkspaceTenantEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceTenantJpaRepository extends JpaRepository<WorkspaceTenantEntity, UUID> {

    Optional<WorkspaceTenantEntity> findByCode(String code);

    boolean existsByCode(String code);
}
