package com.example.autojournal.expenses.internal.dto

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
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
    /** BR-E6. */
    val approximate: Boolean,
)

/** A log entry's editable data, note trimmed (blank = null); the same for create, update and conversion. */
data class LogEntryData(
    val date: LocalDate,
    val odometer: Int?,
    val note: String?,
)

/** A journal entry (ADR 0020): an expense when it has a [cost], a log entry otherwise. */
data class JournalEntry(
    val entry: JournalEntryEntity,
    val cost: ExpenseEntity?,
)

/** An expense with its amount in the user's display currency (BR-C6). */
data class ExpenseView(
    val entry: JournalEntryEntity,
    val cost: ExpenseEntity,
    val displayAmount: BigDecimal,
    val displayCurrency: Currency,
)

/** One vehicle's journal of a year; totals in [currency] from expenses only (BR-I1, BR-J3). */
data class ExpenseYearView(
    val year: Int,
    val firstYear: Int,
    val currency: Currency,
    val yearTotal: BigDecimal,
    /** January … December. */
    val monthTotals: List<BigDecimal>,
    val expenses: List<ExpenseView>,
    /** Newest date first; for the same date, newest created first (BR-J1). */
    val logEntries: List<JournalEntryEntity>,
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
    /** BR-I7; null when no journal entry in the year has an odometer reading. */
    val yearDistanceKm: Int?,
    /** BR-I8; null when [yearDistanceKm] is null or 0. */
    val yearCostPerKm: BigDecimal?,
)

/** One vehicle's all-time insights (BR-I9); every amount in [currency] (BR-C6). */
data class VehicleAllTimeInsightsView(
    val firstYear: Int,
    val currency: Currency,
    val total: BigDecimal,
    val averagePerMonth: BigDecimal,
    /** firstYear … current year, oldest first. */
    val yearTotals: List<YearTotalView>,
    val categories: List<CategoryTotalView>,
    val carValue: BigDecimal,
    val distanceKm: Int,
    /** BR-I4; null when the distance driven is 0. */
    val costPerKm: BigDecimal?,
)

data class YearTotalView(
    val year: Int,
    val total: BigDecimal,
)
