package com.example.autojournal.expenses.internal.entity

import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * Table `autojournal.journal_entry`, owned by the `expenses` module (ADR 0020): what every journal entry has. An
 * expense also has an [ExpenseEntity] with the same id; a log entry has none. The vehicle is referenced by ID only.
 */
@Entity
@Table(name = "journal_entry")
class JournalEntryEntity(
    @Column(name = "vehicle_id", nullable = false, updatable = false)
    val vehicleId: UUID,
    @Column(name = "date", nullable = false)
    var date: LocalDate,
    @Column(name = "odometer")
    var odometer: Int?,
    @Column(name = "note", length = 500)
    var note: String?,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()
