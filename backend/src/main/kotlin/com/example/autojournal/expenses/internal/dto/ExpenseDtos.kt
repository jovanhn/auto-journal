package com.example.autojournal.expenses.internal.dto

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.shared.money.Currency
import java.math.BigDecimal
import java.time.LocalDate
import java.util.UUID

/** An expense's editable data, note trimmed; the same for create and update. */
data class ExpenseData(
    val date: LocalDate,
    val amount: BigDecimal,
    val currency: Currency,
    val category: Category,
    val odometer: Int?,
    val note: String?,
)

/** An expense with its amount in the user's display currency (BR-C6). */
data class ExpenseView(
    val expense: ExpenseEntity,
    val displayAmount: BigDecimal,
    val displayCurrency: Currency,
)

/** One vehicle's expenses of a year; totals in [currency] (BR-I1). */
data class ExpenseYearView(
    val year: Int,
    val firstYear: Int,
    val currency: Currency,
    val yearTotal: BigDecimal,
    /** January … December. */
    val monthTotals: List<BigDecimal>,
    val expenses: List<ExpenseView>,
)

/** The current year across all of a user's vehicles; totals in [currency] (BR-I6). */
data class ExpenseSummaryView(
    val year: Int,
    val currency: Currency,
    val total: BigDecimal,
    val averagePerMonth: BigDecimal,
    val vehicleTotals: Map<UUID, BigDecimal>,
)

/** One category's total in a year (BR-I2). */
data class CategoryTotalView(
    val category: Category,
    val total: BigDecimal,
    val sharePercent: Int,
)

/** One vehicle's insights; every amount in [currency] (BR-C6). */
data class VehicleInsightsView(
    val year: Int,
    val firstYear: Int,
    val currency: Currency,
    val total: BigDecimal,
    val averagePerMonth: BigDecimal,
    /** January … December. */
    val monthTotals: List<BigDecimal>,
    val categories: List<CategoryTotalView>,
    val carValue: BigDecimal,
    val distanceKm: Int,
    /** BR-I4; null when the distance driven is 0. */
    val costPerKm: BigDecimal?,
)
