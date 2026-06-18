package com.roomrental.modules.core.auth.infrastructure.mapper;

import com.roomrental.modules.core.auth.domain.model.Account;
import com.roomrental.modules.core.auth.domain.model.AccountRole;
import com.roomrental.modules.core.auth.domain.model.AccountStatus;
import com.roomrental.modules.core.auth.domain.model.TenantStatus;
import com.roomrental.modules.core.auth.domain.model.WorkspaceTenant;
import com.roomrental.modules.core.auth.infrastructure.entity.AccountEntity;
import com.roomrental.modules.core.auth.infrastructure.entity.WorkspaceTenantEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AuthPersistenceMapper {

    default Account fromEntity(AccountEntity entity) {
        Account account = new Account();
        account.setId(entity.getId());
        account.setTenantId(entity.getTenantId());
        account.setEmail(entity.getEmail());
        account.setFullName(entity.getFullName());
        account.setPasswordHash(entity.getPasswordHash());
        account.setRole(toRole(entity.getRole()));
        account.setStatus(toStatus(entity.getStatus()));
        account.setCreatedAt(entity.getCreatedAt());
        return account;
    }

    default WorkspaceTenant fromEntity(WorkspaceTenantEntity entity) {
        WorkspaceTenant tenant = new WorkspaceTenant();
        tenant.setId(entity.getId());
        tenant.setCode(entity.getCode());
        tenant.setName(entity.getName());
        tenant.setStatus(toTenantStatus(entity.getStatus()));
        tenant.setCreatedAt(entity.getCreatedAt());
        return tenant;
    }

    @Mapping(target = "role", expression = "java(account.getRole() == null ? null : account.getRole().name())")
    @Mapping(target = "status", expression = "java(account.getStatus() == null ? null : account.getStatus().name())")
    AccountEntity toEntity(Account account);

    @Mapping(target = "status", expression = "java(tenant.getStatus() == null ? null : tenant.getStatus().name())")
    WorkspaceTenantEntity toEntity(WorkspaceTenant tenant);

    default AccountRole toRole(String role) {
        return role == null ? null : AccountRole.valueOf(role);
    }

    default AccountStatus toStatus(String status) {
        return status == null ? null : AccountStatus.valueOf(status);
    }

    default TenantStatus toTenantStatus(String status) {
        return status == null ? null : TenantStatus.valueOf(status);
    }
}
