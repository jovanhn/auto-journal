package com.example.autojournal.vehicles.internal.dao

import com.example.autojournal.vehicles.internal.entity.VehicleEntity
import com.example.autojournal.vehicles.internal.repository.VehicleRepository
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `vehicle` table (wraps JPA). */
@Component
class VehicleDao(
    private val repository: VehicleRepository,
) {
    /** Flushes, so a unique-index violation surfaces inside the service and not at commit. */
    fun insert(vehicle: VehicleEntity): VehicleEntity = repository.saveAndFlush(vehicle)

    /** Writes pending changes of managed entities now, for the same reason as [insert]. */
    fun flush() = repository.flush()

    fun findOwned(
        id: UUID,
        ownerId: UUID,
    ): VehicleEntity? = repository.findByIdAndOwnerId(id, ownerId)

    fun findAllOwned(ownerId: UUID): List<VehicleEntity> = repository.findAllByOwnerIdOrderByCreatedAtAsc(ownerId)

    /** Whether another of the owner's vehicles (not [exceptId]) has this nickname, case-insensitive. */
    fun existsNickname(
        ownerId: UUID,
        nickname: String,
        exceptId: UUID,
    ): Boolean = repository.existsNickname(ownerId, nickname, exceptId)

    fun delete(vehicle: VehicleEntity) = repository.delete(vehicle)
}
