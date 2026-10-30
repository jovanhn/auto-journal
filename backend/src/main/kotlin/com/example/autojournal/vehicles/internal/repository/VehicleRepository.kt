package com.example.autojournal.vehicles.internal.repository

import com.example.autojournal.vehicles.internal.entity.VehicleEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.util.UUID

interface VehicleRepository : JpaRepository<VehicleEntity, UUID> {
    fun findAllByOwnerIdOrderByCreatedAtAsc(ownerId: UUID): List<VehicleEntity>

    fun findByIdAndOwnerId(
        id: UUID,
        ownerId: UUID,
    ): VehicleEntity?

    // lower() matches the unique index vehicle_owner_nickname_lower_uk.
    @Query(
        """
        select count(v) > 0 from VehicleEntity v
        where v.ownerId = :ownerId and lower(v.nickname) = lower(:nickname) and v.id <> :exceptId
        """,
    )
    fun existsNickname(
        @Param("ownerId") ownerId: UUID,
        @Param("nickname") nickname: String,
        @Param("exceptId") exceptId: UUID,
    ): Boolean
}
