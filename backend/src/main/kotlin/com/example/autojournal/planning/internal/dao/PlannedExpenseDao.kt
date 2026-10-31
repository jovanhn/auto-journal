package com.example.autojournal.planning.internal.dao

import com.example.autojournal.planning.internal.entity.PlannedExpenseEntity
import com.example.autojournal.planning.internal.repository.PlannedExpenseRepository
import org.springframework.stereotype.Component
import java.util.UUID

/** Write DAO: the module's persistence access for its own `planned_expense` table (wraps JPA). */
@Component
class PlannedExpenseDao(
    private val repository: PlannedExpenseRepository,
) {
    fun insert(plan: PlannedExpenseEntity): PlannedExpenseEntity = repository.save(plan)

    fun find(id: UUID): PlannedExpenseEntity? = repository.findById(id).orElse(null)

    fun findAll(ids: Collection<UUID>): List<PlannedExpenseEntity> = repository.findAllById(ids)

    /** Earliest due date first; for the same date, oldest created first. */
    fun findByVehicle(vehicleId: UUID): List<PlannedExpenseEntity> = repository.findAllByVehicleIdOrderByDueDateAscCreatedAtAsc(vehicleId)

    fun delete(plan: PlannedExpenseEntity) = repository.delete(plan)
}
