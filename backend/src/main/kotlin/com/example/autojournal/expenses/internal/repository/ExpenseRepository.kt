package com.example.autojournal.expenses.internal.repository

import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

interface ExpenseRepository : JpaRepository<ExpenseEntity, UUID> {
    fun findAllByVehicleIdAndDateBetweenOrderByDateDescCreatedAtDesc(
        vehicleId: UUID,
        from: LocalDate,
        to: LocalDate,
    ): List<ExpenseEntity>

    @Query("select min(e.date) from ExpenseEntity e where e.vehicleId = :vehicleId")
    fun findEarliestDate(
        @Param("vehicleId") vehicleId: UUID,
    ): LocalDate?

    /** BR-I4: all of the vehicle's expenses, all years, in EUR at each expense's rate snapshot (full precision). */
    @Query("select coalesce(sum(e.amount * e.rateToEur), 0) from ExpenseEntity e where e.vehicleId = :vehicleId")
    fun sumInEur(
        @Param("vehicleId") vehicleId: UUID,
    ): BigDecimal
}
