package com.roomrental.modules.resident.infrastructure.repository;

import com.roomrental.modules.resident.infrastructure.entity.ResidentProfileEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ResidentProfileJpaRepository extends JpaRepository<ResidentProfileEntity, UUID> {
    boolean existsByIdCardNumber(String idCardNumber);
}
