package com.example.autojournal.planning.internal.dto

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.planning.internal.entity.PlannedExpenseEntity
import com.example.autojournal.shared.money.Currency
import java.math.BigDecimal
import java.time.LocalDate

/** A planned expense's editable data, note trimmed; the same for create and update. */
data class PlannedExpenseData(
    val category: Category,
    val estimatedAmount: BigDecimal,
    val currency: Currency,
    val dueDate: LocalDate,
    val recurrenceMonths: Int?,
    val note: String?,
)

/** A planned expense with its estimate in the user's display currency (BR-C5, BR-C6). */
data class PlannedExpenseView(
    val plan: PlannedExpenseEntity,
    val displayAmount: BigDecimal,
    val displayCurrency: Currency,
    /** BR-PL6. */
    val dueSoon: Boolean,
)

/** One vehicle's planned expenses and the 12-month projection in [currency] (BR-I5). */
data class PlannedExpenseListView(
    val currency: Currency,
    val projectionTotal: BigDecimal,
    val items: List<PlannedExpenseView>,
)
