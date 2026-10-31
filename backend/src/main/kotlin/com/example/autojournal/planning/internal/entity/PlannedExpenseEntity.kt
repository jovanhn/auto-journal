package com.example.autojournal.planning.internal.entity

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/**
 * Table `autojournal.planned_expense`, owned by the `planning` module. The vehicle is referenced by ID only.
 * No rate snapshot: estimates are converted with the current configured rates (BR-C5).
 */
@Entity
@Table(name = "planned_expense")
class PlannedExpenseEntity(
    @Column(name = "vehicle_id", nullable = false, updatable = false)
    val vehicleId: UUID,
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    var category: Category,
    @Column(name = "estimated_amount", nullable = false, precision = 12, scale = 2)
    var estimatedAmount: BigDecimal,
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 3)
    var currency: Currency,
    @Column(name = "due_date", nullable = false)
    var dueDate: LocalDate,
    /** Null = one-time; otherwise every N months. */
    @Column(name = "recurrence_months")
    var recurrenceMonths: Int?,
    @Column(name = "note", length = 500)
    var note: String?,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()
