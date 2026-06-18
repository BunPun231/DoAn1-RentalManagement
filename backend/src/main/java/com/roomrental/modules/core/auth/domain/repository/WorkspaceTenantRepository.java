package com.roomrental.modules.core.auth.domain.repository;

import com.roomrental.modules.core.auth.domain.model.WorkspaceTenant;
import java.util.Optional;

public interface WorkspaceTenantRepository {

    WorkspaceTenant save(WorkspaceTenant tenant);

    Optional<WorkspaceTenant> findByCode(String code);

    boolean existsByCode(String code);
}
