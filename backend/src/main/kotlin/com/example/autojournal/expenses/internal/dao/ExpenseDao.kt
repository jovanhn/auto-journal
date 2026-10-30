package com.example.autojournal.expenses.internal.dao

import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.expenses.internal.repository.ExpenseRepository
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.util.UUID

/** Write DAO: the module's persistence access for its own `expense` table (wraps JPA). */
@Component
class ExpenseDao(
    private val repository: ExpenseRepository,
) {
    fun insert(expense: ExpenseEntity): ExpenseEntity = repository.save(expense)

    fun find(id: UUID): ExpenseEntity? = repository.findById(id).orElse(null)

    /** Newest date first; for the same date, newest created first. */
    fun findInPeriod(
        vehicleId: UUID,
        from: LocalDate,
        to: LocalDate,
    ): List<ExpenseEntity> = repository.findAllByVehicleIdAndDateBetweenOrderByDateDescCreatedAtDesc(vehicleId, from, to)

    fun earliestDate(vehicleId: UUID): LocalDate? = repository.findEarliestDate(vehicleId)

    fun delete(expense: ExpenseEntity) = repository.delete(expense)
}
