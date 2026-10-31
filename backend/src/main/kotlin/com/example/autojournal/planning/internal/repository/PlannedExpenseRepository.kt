package com.example.autojournal.planning.internal.repository

import com.example.autojournal.planning.internal.entity.PlannedExpenseEntity
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

interface PlannedExpenseRepository : JpaRepository<PlannedExpenseEntity, UUID> {
    fun findAllByVehicleIdOrderByDueDateAscCreatedAtAsc(vehicleId: UUID): List<PlannedExpenseEntity>
}
