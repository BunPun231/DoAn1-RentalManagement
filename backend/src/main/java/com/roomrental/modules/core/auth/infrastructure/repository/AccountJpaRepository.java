package com.roomrental.modules.core.auth.infrastructure.repository;

import com.roomrental.modules.core.auth.infrastructure.entity.AccountEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountJpaRepository extends JpaRepository<AccountEntity, UUID> {

    Optional<AccountEntity> findByEmailAndTenantId(String email, UUID tenantId);

    Optional<AccountEntity> findByEmail(String email);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);
}
