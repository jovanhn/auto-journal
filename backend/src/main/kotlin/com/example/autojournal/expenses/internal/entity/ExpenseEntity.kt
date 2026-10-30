package com.example.autojournal.expenses.internal.entity

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

/** Fixed expense categories (BR-E3). */
enum class Category {
    FUEL,
    SERVICE,
    REPAIRS,
    INSURANCE,
    REGISTRATION_TAX,
    TIRES,
    PARKING_TOLLS,
    OTHER,
}

/** Table `autojournal.expense`, owned by the `expenses` module. The vehicle is referenced by ID only. */
@Entity
@Table(name = "expense")
class ExpenseEntity(
    @Column(name = "vehicle_id", nullable = false, updatable = false)
    val vehicleId: UUID,
    @Column(name = "date", nullable = false)
    var date: LocalDate,
    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    var amount: BigDecimal,
    @Enumerated(EnumType.STRING)
    @Column(name = "currency", nullable = false, length = 3)
    var currency: Currency,
    @Column(name = "rate_to_eur", nullable = false, precision = 20, scale = 16)
    var rateToEur: BigDecimal,
    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 20)
    var category: Category,
    @Column(name = "odometer")
    var odometer: Int?,
    @Column(name = "note", length = 500)
    var note: String?,
    @Column(name = "created_at", nullable = false, updatable = false)
    val createdAt: Instant = Instant.now(),
) : AssignedIdEntity()
