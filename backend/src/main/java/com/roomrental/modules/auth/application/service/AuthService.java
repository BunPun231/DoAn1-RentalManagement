package com.roomrental.modules.auth.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.security.JwtTokenService;
import com.roomrental.modules.auth.application.dto.AuthResult;
import com.roomrental.modules.auth.application.dto.LoginCommand;
import com.roomrental.modules.auth.application.dto.RegisterCommand;
import com.roomrental.modules.auth.domain.model.Tenant;
import com.roomrental.modules.auth.domain.model.TenantStatus;
import com.roomrental.modules.auth.domain.model.User;
import com.roomrental.modules.auth.domain.model.UserRole;
import com.roomrental.modules.auth.domain.model.UserStatus;
import com.roomrental.modules.auth.domain.repository.TenantRepository;
import com.roomrental.modules.auth.domain.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Application service for authentication use cases (UC01, UC02).
 */
@Service
public class AuthService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;

    public AuthService(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService
    ) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * UC01: Self-registration for a new Manager.
     * Creates a Tenant (workspace) + User (role=MANAGER).
     */
    @Transactional
    public AuthResult registerManager(RegisterCommand command) {
        // Validate uniqueness
        if (userRepository.existsByPhone(command.phone())) {
            throw new BaseException(HttpStatus.CONFLICT, "PHONE_EXISTS",
                    "Phone number is already registered");
        }
        if (command.email() != null && userRepository.existsByEmail(command.email().toLowerCase(Locale.ROOT))) {
            throw new BaseException(HttpStatus.CONFLICT, "EMAIL_EXISTS",
                    "Email is already registered");
        }

        // Create user first (to get UUID for tenant.owner_user_id)
        User user = new User();
        user.setPhone(command.phone());
        user.setEmail(command.email() != null ? command.email().toLowerCase(Locale.ROOT) : null);
        user.setFullName(command.fullName());
        user.setPasswordHash(passwordEncoder.encode(command.password()));
        user.setRole(UserRole.MANAGER);
        user.setStatus(UserStatus.ACTIVE);
        user.setMustChangePassword(false);
        user = userRepository.save(user);

        // Create tenant workspace
        Tenant tenant = new Tenant();
        tenant.setName(command.tenantName());
        tenant.setOwnerUserId(user.getId());
        tenant.setStatus(TenantStatus.TRIAL);
        tenant = tenantRepository.save(tenant);

        // Link user to tenant
        user.setTenantId(tenant.getId());
        user = userRepository.save(user);

        return buildAuthResult(user, tenant);
    }

    /**
     * UC02: Login by phone or email + password.
     */
    @Transactional
    public AuthResult login(LoginCommand command) {
        String identity = command.identity().trim().toLowerCase(Locale.ROOT);

        // Find user by phone or email
        User user = userRepository.findByPhoneOrEmail(identity, identity)
                .orElseThrow(() -> new BaseException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                        "Invalid credentials"));

        // Verify password
        if (!passwordEncoder.matches(command.password(), user.getPasswordHash())) {
            throw new BaseException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS",
                    "Invalid credentials");
        }

        // Check account status
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new BaseException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED",
                    "Your account has been locked. Please contact support.");
        }
        if (user.getStatus() == UserStatus.INACTIVE) {
            throw new BaseException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE",
                    "Your account is inactive.");
        }

        // Update last login
        user.setLastLoginAt(OffsetDateTime.now());
        userRepository.save(user);

        // Load tenant (null for ADMIN role)
        Tenant tenant = null;
        if (user.getTenantId() != null) {
            tenant = tenantRepository.findById(user.getTenantId()).orElse(null);
        }

        return buildAuthResult(user, tenant);
    }

    private AuthResult buildAuthResult(User user, Tenant tenant) {
        Map<String, Object> claims = new HashMap<>();
        if (tenant != null) {
            claims.put("tenantId", tenant.getId().toString());
        }
        claims.put("role", user.getRole().name());

        String token = jwtTokenService.generateToken(user.getId(), claims);

        return new AuthResult(
                token,
                "Bearer",
                user.getId(),
                tenant != null ? tenant.getId() : null,
                user.getRole().name(),
                user.getFullName()
        );
    }
}
