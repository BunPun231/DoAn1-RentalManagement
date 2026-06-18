package com.roomrental.modules.motel.infrastructure.persistence;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MotelJpaRepository extends JpaRepository<MotelEntity, Long> {
    List<MotelEntity> findByTenantIdAndDeletedFalse(UUID tenantId);

    Optional<MotelEntity> findByIdAndTenantIdAndDeletedFalse(Long id, UUID tenantId);
}
