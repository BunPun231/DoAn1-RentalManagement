package com.roomrental.modules.core.auth.infrastructure.adapter;

import com.roomrental.modules.core.auth.domain.model.Account;
import com.roomrental.modules.core.auth.domain.repository.AccountRepository;
import com.roomrental.modules.core.auth.infrastructure.entity.AccountEntity;
import com.roomrental.modules.core.auth.infrastructure.mapper.AuthPersistenceMapper;
import com.roomrental.modules.core.auth.infrastructure.repository.AccountJpaRepository;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class AccountRepositoryAdapter implements AccountRepository {

    private final AccountJpaRepository accountJpaRepository;
    private final AuthPersistenceMapper mapper;

    public AccountRepositoryAdapter(AccountJpaRepository accountJpaRepository, AuthPersistenceMapper mapper) {
        this.accountJpaRepository = accountJpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Account save(Account account) {
        AccountEntity entity = mapper.toEntity(account);
        return mapper.fromEntity(accountJpaRepository.save(entity));
    }

    @Override
    public Optional<Account> findByEmailAndTenantId(String email, UUID tenantId) {
        return accountJpaRepository.findByEmailAndTenantId(email, tenantId).map(mapper::fromEntity);
    }

    @Override
    public Optional<Account> findByEmail(String email) {
        return accountJpaRepository.findByEmail(email).map(mapper::fromEntity);
    }

    @Override
    public boolean existsByEmailAndTenantId(String email, UUID tenantId) {
        return accountJpaRepository.existsByEmailAndTenantId(email, tenantId);
    }
}
