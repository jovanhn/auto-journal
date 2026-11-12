package com.example.autojournal.expenses.internal.mapper

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.expenses.internal.dto.CategoryTotalView
import com.example.autojournal.expenses.internal.dto.ExpenseData
import com.example.autojournal.expenses.internal.dto.ExpenseSummaryView
import com.example.autojournal.expenses.internal.dto.ExpenseView
import com.example.autojournal.expenses.internal.dto.ExpenseYearView
import com.example.autojournal.expenses.internal.dto.JournalView
import com.example.autojournal.expenses.internal.dto.LogEntryData
import com.example.autojournal.expenses.internal.dto.VehicleAllTimeInsightsView
import com.example.autojournal.expenses.internal.dto.VehicleInsightsView
import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
import com.example.autojournal.shared.money.Currency
import com.example.contract.model.CategoryTotal
import com.example.contract.model.Expense
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.ExpenseSummary
import com.example.contract.model.ExpenseYear
import com.example.contract.model.Journal
import com.example.contract.model.LogEntry
import com.example.contract.model.LogEntryRequest
import com.example.contract.model.Money
import com.example.contract.model.VehicleAllTimeInsights
import com.example.contract.model.VehicleExpenseTotal
import com.example.contract.model.VehicleInsights
import com.example.contract.model.YearTotal
import java.math.BigDecimal
import java.time.ZoneOffset
import com.example.contract.model.Category as ContractCategory
import com.example.contract.model.Currency as ContractCurrency

/** The note is trimmed; a blank note is stored as null (specs/expenses.md edge cases). */
fun ExpenseRequest.toData(): ExpenseData =
    ExpenseData(
        date = date,
        amount = BigDecimal(amount.amount),
        currency = Currency.valueOf(amount.currency.name),
        category = Category.valueOf(category.name),
        odometer = odometer,
        note = note.trimToNull(),
        approximate = approximate ?: false,
    )

/** The note is trimmed; a blank note counts as none (specs/journal.md edge cases, BR-J2). */
fun LogEntryRequest.toData(): LogEntryData = LogEntryData(date = date, odometer = odometer, note = note.trimToNull())

fun JournalEntryEntity.toContract(): LogEntry =
    LogEntry(
        id = id,
        vehicleId = vehicleId,
        date = date,
        odometer = odometer,
        note = note,
        createdAt = createdAt.atOffset(ZoneOffset.UTC),
    )

private fun String?.trimToNull(): String? = this?.trim()?.ifEmpty { null }

fun ExpenseView.toContract(): Expense =
    Expense(
        id = entry.id,
        vehicleId = entry.vehicleId,
        date = entry.date,
        amount = money(cost.amount, cost.currency),
        displayAmount = money(displayAmount, displayCurrency),
        category = ContractCategory.valueOf(cost.category.name),
        odometer = entry.odometer,
        note = entry.note,
        approximate = cost.approximate,
        createdAt = entry.createdAt.atOffset(ZoneOffset.UTC),
    )

fun ExpenseYearView.toContract(): ExpenseYear =
    ExpenseYear(
        year = year,
        firstYear = firstYear,
        yearTotal = money(yearTotal, currency),
        monthTotals = monthTotals.map { money(it, currency) },
        expenses = expenses.map { it.toContract() },
        logEntries = logEntries.map { it.toContract() },
    )

fun JournalView.toContract(): Journal =
    Journal(
        firstYear = firstYear,
        expenses = expenses.map { it.toContract() },
        logEntries = logEntries.map { it.toContract() },
    )

fun ExpenseSummaryView.toContract(): ExpenseSummary =
    ExpenseSummary(
        year = year,
        total = money(total, currency),
        averagePerMonth = money(averagePerMonth, currency),
        vehicles = vehicleTotals.map { (vehicleId, total) -> VehicleExpenseTotal(vehicleId, money(total, currency)) },
    )

fun VehicleInsightsView.toContract(): VehicleInsights =
    VehicleInsights(
        year = year,
        firstYear = firstYear,
        total = money(total, currency),
        averagePerMonth = money(averagePerMonth, currency),
        monthTotals = monthTotals.map { money(it, currency) },
        categories = categories.map { it.toContract(currency) },
        carValue = money(carValue, currency),
        distanceKm = distanceKm,
        costPerKm = costPerKm?.let { money(it, currency) },
        yearDistanceKm = yearDistanceKm,
        yearCostPerKm = yearCostPerKm?.let { money(it, currency) },
    )

fun VehicleAllTimeInsightsView.toContract(): VehicleAllTimeInsights =
    VehicleAllTimeInsights(
        firstYear = firstYear,
        total = money(total, currency),
        averagePerMonth = money(averagePerMonth, currency),
        yearTotals = yearTotals.map { YearTotal(it.year, money(it.total, currency)) },
        categories = categories.map { it.toContract(currency) },
        carValue = money(carValue, currency),
        distanceKm = distanceKm,
        costPerKm = costPerKm?.let { money(it, currency) },
    )

private fun CategoryTotalView.toContract(currency: Currency) =
    CategoryTotal(ContractCategory.valueOf(category.name), money(total, currency), sharePercent)

private fun money(
    amount: BigDecimal,
    currency: Currency,
) = Money(amount = amount.setScale(2).toPlainString(), currency = ContractCurrency.valueOf(currency.name))
