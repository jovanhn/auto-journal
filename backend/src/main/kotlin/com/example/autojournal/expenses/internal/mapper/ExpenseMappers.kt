package com.example.autojournal.expenses.internal.mapper

import com.example.autojournal.expenses.internal.dto.ExpenseData
import com.example.autojournal.expenses.internal.dto.ExpenseSummaryView
import com.example.autojournal.expenses.internal.dto.ExpenseView
import com.example.autojournal.expenses.internal.dto.ExpenseYearView
import com.example.autojournal.expenses.internal.entity.Category
import com.example.autojournal.shared.money.Currency
import com.example.contract.model.Expense
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.ExpenseSummary
import com.example.contract.model.ExpenseYear
import com.example.contract.model.Money
import com.example.contract.model.VehicleExpenseTotal
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
        note = note?.trim()?.ifEmpty { null },
    )

fun ExpenseView.toContract(): Expense =
    Expense(
        id = expense.id,
        vehicleId = expense.vehicleId,
        date = expense.date,
        amount = money(expense.amount, expense.currency),
        displayAmount = money(displayAmount, displayCurrency),
        category = ContractCategory.valueOf(expense.category.name),
        odometer = expense.odometer,
        note = expense.note,
        createdAt = expense.createdAt.atOffset(ZoneOffset.UTC),
    )

fun ExpenseYearView.toContract(): ExpenseYear =
    ExpenseYear(
        year = year,
        firstYear = firstYear,
        yearTotal = money(yearTotal, currency),
        monthTotals = monthTotals.map { money(it, currency) },
        expenses = expenses.map { it.toContract() },
    )

fun ExpenseSummaryView.toContract(): ExpenseSummary =
    ExpenseSummary(
        year = year,
        total = money(total, currency),
        averagePerMonth = money(averagePerMonth, currency),
        vehicles = vehicleTotals.map { (vehicleId, total) -> VehicleExpenseTotal(vehicleId, money(total, currency)) },
    )

private fun money(
    amount: BigDecimal,
    currency: Currency,
) = Money(amount = amount.setScale(2).toPlainString(), currency = ContractCurrency.valueOf(currency.name))
