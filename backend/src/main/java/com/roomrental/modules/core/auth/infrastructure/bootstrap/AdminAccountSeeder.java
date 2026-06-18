package com.roomrental.modules.core.auth.infrastructure.bootstrap;

import com.roomrental.common.config.AppProperties;
import com.roomrental.modules.core.auth.domain.model.Account;
import com.roomrental.modules.core.auth.domain.model.AccountRole;
import com.roomrental.modules.core.auth.domain.model.AccountStatus;
import com.roomrental.modules.core.auth.domain.model.TenantStatus;
import com.roomrental.modules.core.auth.domain.model.WorkspaceTenant;
import com.roomrental.modules.core.auth.domain.repository.AccountRepository;
import com.roomrental.modules.core.auth.domain.repository.WorkspaceTenantRepository;
import java.util.Locale;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminAccountSeeder implements ApplicationRunner {

    private final AppProperties appProperties;
    private final WorkspaceTenantRepository workspaceTenantRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountSeeder(
            AppProperties appProperties,
            WorkspaceTenantRepository workspaceTenantRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.appProperties = appProperties;
        this.workspaceTenantRepository = workspaceTenantRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.Bootstrap bootstrap = appProperties.bootstrap();
        if (bootstrap == null || bootstrap.admin() == null || !bootstrap.admin().enabled()) {
            return;
        }

        AppProperties.Admin admin = bootstrap.admin();
        String tenantCode = admin.tenantCode().toLowerCase(Locale.ROOT);
        String email = admin.email().toLowerCase(Locale.ROOT);

        WorkspaceTenant tenant = workspaceTenantRepository.findByCode(tenantCode)
                .orElseGet(() -> {
                    WorkspaceTenant newTenant = new WorkspaceTenant();
                    newTenant.setCode(tenantCode);
                    newTenant.setName(admin.tenantName());
                    newTenant.setStatus(TenantStatus.ACTIVE);
                    return workspaceTenantRepository.save(newTenant);
                });

        if (accountRepository.existsByEmailAndTenantId(email, tenant.getId())) {
            return;
        }

        Account account = new Account();
        account.setTenantId(tenant.getId());
        account.setFullName(admin.fullName());
        account.setEmail(email);
        account.setPasswordHash(passwordEncoder.encode(admin.password()));
        account.setRole(AccountRole.ADMIN);
        account.setStatus(AccountStatus.ACTIVE);
        accountRepository.save(account);
    }
}