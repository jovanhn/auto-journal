package com.example.autojournal.issues.internal.repository

import com.example.autojournal.issues.internal.entity.IssueEntity
import jakarta.persistence.LockModeType
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Lock
import java.util.UUID

interface IssueRepository : JpaRepository<IssueEntity, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    fun findLockedById(id: UUID): IssueEntity?

    fun findAllByVehicleId(vehicleId: UUID): List<IssueEntity>

    fun countByVehicleId(vehicleId: UUID): Long
}
