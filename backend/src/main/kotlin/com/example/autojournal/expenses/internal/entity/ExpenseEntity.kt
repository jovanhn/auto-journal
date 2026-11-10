package com.example.autojournal.expenses.internal.entity

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.persistence.AssignedIdEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Table
import java.math.BigDecimal
import java.util.UUID

/**
 * Table `autojournal.expense`, owned by the `expenses` module (ADR 0020): the cost of the journal entry with the
 * same [id]. Date, odometer and note are on the [JournalEntryEntity].
 */
@Entity
@Table(name = "expense")
class ExpenseEntity(
    id: UUID,
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
    /** BR-E6: the amount and/or date is a best guess; only marks the expense. */
    @Column(name = "approximate", nullable = false)
    var approximate: Boolean = false,
) : AssignedIdEntity(id)
