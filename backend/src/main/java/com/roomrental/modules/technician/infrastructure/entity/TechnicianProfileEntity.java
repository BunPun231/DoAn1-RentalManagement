package com.roomrental.modules.technician.infrastructure.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "technician_profiles")
@Getter @Setter @NoArgsConstructor
public class TechnicianProfileEntity {

    @Id
    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "expertise", columnDefinition = "TEXT[]")
    private String[] expertise;

    @Column(name = "is_available", nullable = false)
    private boolean available = true;

    @Column(name = "assigned_motel_ids", columnDefinition = "INTEGER[]")
    private Integer[] assignedMotelIds;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = OffsetDateTime.now();
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}
