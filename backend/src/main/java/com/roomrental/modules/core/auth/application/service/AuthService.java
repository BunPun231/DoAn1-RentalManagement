package com.roomrental.modules.core.auth.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.security.JwtTokenService;
import com.roomrental.modules.core.auth.application.dto.AuthResult;
import com.roomrental.modules.core.auth.application.dto.LoginCommand;
import com.roomrental.modules.core.auth.application.dto.RegisterCommand;
import com.roomrental.modules.core.auth.domain.model.Account;
import com.roomrental.modules.core.auth.domain.model.AccountRole;
import com.roomrental.modules.core.auth.domain.model.AccountStatus;
import com.roomrental.modules.core.auth.domain.model.TenantStatus;
import com.roomrental.modules.core.auth.domain.model.WorkspaceTenant;
import com.roomrental.modules.core.auth.domain.repository.AccountRepository;
import com.roomrental.modules.core.auth.domain.repository.WorkspaceTenantRepository;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final WorkspaceTenantRepository workspaceTenantRepository;
    private final AccountRepository accountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(
            WorkspaceTenantRepository workspaceTenantRepository,
            AccountRepository accountRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService
    ) {
        this.workspaceTenantRepository = workspaceTenantRepository;
        this.accountRepository = accountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    @Transactional
    public AuthResult registerManager(RegisterCommand command) {
        String tenantCode = buildTenantCode(command.tenantName());
        if (workspaceTenantRepository.existsByCode(tenantCode)) {
            throw new BaseException(HttpStatus.CONFLICT, "MSG02", "Tenant code already exists");
        }

        WorkspaceTenant tenant = new WorkspaceTenant();
        tenant.setCode(tenantCode);
        tenant.setName(command.tenantName());
        tenant.setStatus(TenantStatus.TRIAL);
        tenant = workspaceTenantRepository.save(tenant);

        if (accountRepository.existsByEmailAndTenantId(command.email().toLowerCase(Locale.ROOT), tenant.getId())) {
            throw new BaseException(HttpStatus.CONFLICT, "MSG03", "Email already exists in tenant");
        }

        Account account = new Account();
        account.setTenantId(tenant.getId());
        account.setFullName(command.fullName());
        account.setEmail(command.email().toLowerCase(Locale.ROOT));
        account.setPasswordHash(passwordEncoder.encode(command.password()));
        account.setRole(AccountRole.MANAGER);
        account.setStatus(AccountStatus.ACTIVE);

        account = accountRepository.save(account);
        return toResult(account, tenant);
    }

    @Transactional
    public AuthResult login(LoginCommand command) {
        WorkspaceTenant tenant = workspaceTenantRepository.findByCode(command.tenantCode())
                .orElseThrow(() -> new BaseException(HttpStatus.UNAUTHORIZED, "MSG04", "Invalid tenant code or credentials"));

        Account account = accountRepository.findByEmailAndTenantId(command.email().toLowerCase(Locale.ROOT), tenant.getId())
                .orElseThrow(() -> new BaseException(HttpStatus.UNAUTHORIZED, "MSG04", "Invalid tenant code or credentials"));

        if (!passwordEncoder.matches(command.password(), account.getPasswordHash())) {
            throw new BaseException(HttpStatus.UNAUTHORIZED, "MSG04", "Invalid tenant code or credentials");
        }

        return toResult(account, tenant);
    }

    private AuthResult toResult(Account account, WorkspaceTenant tenant) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("tenantId", tenant.getId().toString());
        claims.put("tenantCode", tenant.getCode());
        claims.put("role", account.getRole().name());
        claims.put("email", account.getEmail());

        String token = jwtTokenService.generateToken(account.getId(), claims);
        return new AuthResult(token, "Bearer", account.getId(), tenant.getId(), tenant.getCode(), account.getRole().name());
    }

    private String buildTenantCode(String tenantName) {
        String normalized = Normalizer.normalize(tenantName, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");

        if (normalized.isBlank()) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "MSG01", "Invalid tenant name");
        }
        return normalized;
    }
}
