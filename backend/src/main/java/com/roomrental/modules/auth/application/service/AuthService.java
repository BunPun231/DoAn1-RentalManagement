package com.roomrental.modules.auth.application.service;

import com.roomrental.common.exception.BaseException;
import com.roomrental.common.security.JwtTokenService;
import com.roomrental.modules.activity.application.dto.ActivityLogCreateCommand;
import com.roomrental.modules.activity.application.service.ActivityLogService;
import com.roomrental.modules.audit.application.dto.AuditLogCreateCommand;
import com.roomrental.modules.audit.application.service.AuditLogService;
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
    private final PasswordHistoryService passwordHistoryService;
    private final org.springframework.data.redis.core.StringRedisTemplate redisTemplate;
    private final ActivityLogService activityLogService;
    private final AuditLogService auditLogService;

    public AuthService(
            TenantRepository tenantRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtTokenService jwtTokenService,
            PasswordHistoryService passwordHistoryService,
            org.springframework.data.redis.core.StringRedisTemplate redisTemplate,
            ActivityLogService activityLogService,
            AuditLogService auditLogService
    ) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenService = jwtTokenService;
        this.passwordHistoryService = passwordHistoryService;
        this.redisTemplate = redisTemplate;
        this.activityLogService = activityLogService;
        this.auditLogService = auditLogService;
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
        String encodedPassword = passwordEncoder.encode(command.password());
        user.setPasswordHash(encodedPassword);
        user.setRole(UserRole.MANAGER);
        user.setStatus(UserStatus.ACTIVE);
        user.setMustChangePassword(false);
        user.setSessionVersion(0);
        user = userRepository.save(user);

        // Save password history
        passwordHistoryService.save(user.getId(), encodedPassword);

        // Create tenant workspace
        Tenant tenant = new Tenant();
        tenant.setName(command.tenantName());
        tenant.setOwnerUserId(user.getId());
        tenant.setStatus(TenantStatus.TRIAL);
        tenant = tenantRepository.save(tenant);

        // Link user to tenant
        user.setTenantId(tenant.getId());
        user = userRepository.save(user);

        activityLogService.log(new ActivityLogCreateCommand(
                tenant.getId(),
                user.getId(),
                "MANAGER",
                "REGISTER_MANAGER",
                "User",
                user.getId().toString(),
                null,
                user.getFullName(),
                null
        ));

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

        if (user.getRole() == UserRole.ADMIN) {
            auditLogService.log(new AuditLogCreateCommand(
                    user.getId(),
                    user.getRole().name(),
                    "ADMIN_LOGIN",
                    "User",
                    user.getId().toString(),
                    null,
                    "SUCCESS",
                    null, null, null
            ));
        } else {
            activityLogService.log(new ActivityLogCreateCommand(
                    user.getTenantId(),
                    user.getId(),
                    user.getRole().name(),
                    "USER_LOGIN",
                    "User",
                    user.getId().toString(),
                    null,
                    "SUCCESS",
                    null
            ));
        }

        return buildAuthResult(user, tenant);
    }

    @Transactional
    public void changePassword(java.util.UUID userId, com.roomrental.modules.auth.application.dto.ChangePasswordCommand command) {
        if (!command.newPassword().equals(command.confirmPassword())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH", "Passwords do not match");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BaseException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        if (!passwordEncoder.matches(command.oldPassword(), user.getPasswordHash())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "INVALID_PASSWORD", "Invalid old password");
        }

        if (passwordHistoryService.isPasswordReused(userId, command.newPassword())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "PASSWORD_REUSED", "Password has been used recently");
        }

        String encodedPassword = passwordEncoder.encode(command.newPassword());
        user.setPasswordHash(encodedPassword);
        user.setMustChangePassword(false);
        user.setSessionVersion(user.getSessionVersion() == null ? 1 : user.getSessionVersion() + 1);
        userRepository.save(user);

        passwordHistoryService.save(user.getId(), encodedPassword);

        if (user.getRole() == UserRole.ADMIN) {
            auditLogService.log(new AuditLogCreateCommand(
                    user.getId(),
                    user.getRole().name(),
                    "CHANGE_PASSWORD",
                    "User",
                    user.getId().toString(),
                    null,
                    "CHANGED",
                    null, null, null
            ));
        } else {
            activityLogService.log(new ActivityLogCreateCommand(
                    user.getTenantId(),
                    user.getId(),
                    user.getRole().name(),
                    "CHANGE_PASSWORD",
                    "User",
                    user.getId().toString(),
                    null,
                    "CHANGED",
                    null
            ));
        }
    }

    @Transactional
    public void forgotPassword(com.roomrental.modules.auth.application.dto.ForgotPasswordCommand command) {
        String identity = command.identity().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByPhoneOrEmail(identity, identity)
                .orElseThrow(() -> new BaseException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        // Generate 6-digit OTP
        String otp = String.format("%06d", new java.util.Random().nextInt(999999));
        
        // Save to Redis with 5-minute expiry
        String redisKey = "pwd_reset_otp:" + identity;
        redisTemplate.opsForValue().set(redisKey, otp, java.time.Duration.ofMinutes(5));

        // TODO: Send OTP via Email/SMS
        System.out.println("OTP for " + identity + ": " + otp);
    }

    @Transactional
    public void resetPassword(com.roomrental.modules.auth.application.dto.ResetPasswordCommand command) {
        if (!command.newPassword().equals(command.confirmPassword())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "PASSWORD_MISMATCH", "Passwords do not match");
        }

        String identity = command.identity().trim().toLowerCase(Locale.ROOT);
        String redisKey = "pwd_reset_otp:" + identity;
        String savedOtp = redisTemplate.opsForValue().get(redisKey);

        if (savedOtp == null || !savedOtp.equals(command.otp())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Invalid or expired OTP");
        }

        User user = userRepository.findByPhoneOrEmail(identity, identity)
                .orElseThrow(() -> new BaseException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));

        if (passwordHistoryService.isPasswordReused(user.getId(), command.newPassword())) {
            throw new BaseException(HttpStatus.BAD_REQUEST, "PASSWORD_REUSED", "Password has been used recently");
        }

        String encodedPassword = passwordEncoder.encode(command.newPassword());
        user.setPasswordHash(encodedPassword);
        user.setMustChangePassword(true); // BR87: Force change password sau khi reset
        user.setSessionVersion(user.getSessionVersion() == null ? 1 : user.getSessionVersion() + 1);
        userRepository.save(user);

        passwordHistoryService.save(user.getId(), encodedPassword);
        redisTemplate.delete(redisKey);

        if (user.getRole() == UserRole.ADMIN) {
            auditLogService.log(new AuditLogCreateCommand(
                    user.getId(),
                    user.getRole().name(),
                    "RESET_PASSWORD",
                    "User",
                    user.getId().toString(),
                    null,
                    "RESET",
                    null, null, null
            ));
        } else {
            activityLogService.log(new ActivityLogCreateCommand(
                    user.getTenantId(),
                    user.getId(),
                    user.getRole().name(),
                    "RESET_PASSWORD",
                    "User",
                    user.getId().toString(),
                    null,
                    "RESET",
                    null
            ));
        }
    }

    private AuthResult buildAuthResult(User user, Tenant tenant) {
        Map<String, Object> claims = new HashMap<>();
        if (tenant != null) {
            claims.put("tenantId", tenant.getId().toString());
        }
        claims.put("role", user.getRole().name());
        claims.put("session_version", user.getSessionVersion() == null ? 0 : user.getSessionVersion());

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
