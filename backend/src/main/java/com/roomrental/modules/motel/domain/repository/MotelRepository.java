package com.roomrental.modules.motel.domain.repository;

import com.roomrental.modules.motel.domain.model.Motel;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MotelRepository {

    Motel save(Motel motel);

    List<Motel> findByTenantIdAndDeletedFalse(UUID tenantId);

    Optional<Motel> findByIdAndTenantIdAndDeletedFalse(Long id, UUID tenantId);
}
