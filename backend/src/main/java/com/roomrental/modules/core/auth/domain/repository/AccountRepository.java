package com.roomrental.modules.core.auth.domain.repository;

import com.roomrental.modules.core.auth.domain.model.Account;
import java.util.Optional;
import java.util.UUID;

public interface AccountRepository {

    Account save(Account account);

    Optional<Account> findByEmailAndTenantId(String email, UUID tenantId);

    Optional<Account> findByEmail(String email);

    boolean existsByEmailAndTenantId(String email, UUID tenantId);
}
