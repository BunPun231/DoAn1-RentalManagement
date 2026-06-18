package com.roomrental.modules.room.infrastructure.repository;

import com.roomrental.modules.room.infrastructure.entity.RoomEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoomJpaRepository extends JpaRepository<RoomEntity, Long> {

    Optional<RoomEntity> findByIdAndMotelId(Long id, Long motelId);

    Page<RoomEntity> findByMotelId(Long motelId, Pageable pageable);

    boolean existsByMotelIdAndRoomNumber(Long motelId, String roomNumber);
}
