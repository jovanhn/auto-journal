package com.example.autojournal.expenses.internal.repository

import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import java.time.LocalDate
import java.util.UUID

interface JournalEntryRepository : JpaRepository<JournalEntryEntity, UUID> {
    fun countByVehicleId(vehicleId: UUID): Long

    fun findAllByVehicleIdAndDateBetweenOrderByDateDescCreatedAtDesc(
        vehicleId: UUID,
        from: LocalDate,
        to: LocalDate,
    ): List<JournalEntryEntity>

    fun findAllByVehicleId(vehicleId: UUID): List<JournalEntryEntity>

    fun findAllByVehicleIdOrderByDateDescCreatedAtDesc(vehicleId: UUID): List<JournalEntryEntity>

    @Query("select min(e.date) from JournalEntryEntity e where e.vehicleId = :vehicleId")
    fun findEarliestDate(
        @Param("vehicleId") vehicleId: UUID,
    ): LocalDate?
}
