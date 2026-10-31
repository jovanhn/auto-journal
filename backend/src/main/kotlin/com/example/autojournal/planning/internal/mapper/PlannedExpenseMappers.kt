package com.example.autojournal.planning.internal.mapper

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.expenses.api.CreatedExpense
import com.example.autojournal.expenses.api.NewExpense
import com.example.autojournal.planning.internal.dto.PlannedExpenseData
import com.example.autojournal.planning.internal.dto.PlannedExpenseListView
import com.example.autojournal.planning.internal.dto.PlannedExpenseView
import com.example.autojournal.shared.money.Currency
import com.example.contract.model.Expense
import com.example.contract.model.ExpenseRequest
import com.example.contract.model.Money
import com.example.contract.model.NextDuePlannedExpense
import com.example.contract.model.PlannedExpense
import com.example.contract.model.PlannedExpenseList
import com.example.contract.model.PlannedExpenseRequest
import java.math.BigDecimal
import java.time.ZoneOffset
import com.example.contract.model.Category as ContractCategory
import com.example.contract.model.Currency as ContractCurrency

/** The note is trimmed; a blank note is stored as null (specs/planned-expenses.md edge cases). */
fun PlannedExpenseRequest.toData(): PlannedExpenseData =
    PlannedExpenseData(
        category = Category.valueOf(category.name),
        estimatedAmount = BigDecimal(estimatedAmount.amount),
        currency = Currency.valueOf(estimatedAmount.currency.name),
        dueDate = dueDate,
        recurrenceMonths = recurrenceMonths,
        note = note?.trim()?.ifEmpty { null },
    )

/** The expense of Mark as paid; the service replaces its category with the plan's (BR-PL2). */
fun ExpenseRequest.toNewExpense(): NewExpense =
    NewExpense(
        date = date,
        amount = BigDecimal(amount.amount),
        currency = Currency.valueOf(amount.currency.name),
        category = Category.valueOf(category.name),
        odometer = odometer,
        note = note?.trim()?.ifEmpty { null },
    )

fun PlannedExpenseView.toContract(): PlannedExpense =
    PlannedExpense(
        id = plan.id,
        vehicleId = plan.vehicleId,
        category = ContractCategory.valueOf(plan.category.name),
        estimatedAmount = money(plan.estimatedAmount, plan.currency),
        displayAmount = money(displayAmount, displayCurrency),
        dueDate = plan.dueDate,
        recurrenceMonths = plan.recurrenceMonths,
        note = plan.note,
        dueSoon = dueSoon,
        createdAt = plan.createdAt.atOffset(ZoneOffset.UTC),
    )

fun PlannedExpenseView.toNextDueContract(): NextDuePlannedExpense =
    NextDuePlannedExpense(vehicleId = plan.vehicleId, plannedExpense = toContract())

fun PlannedExpenseListView.toContract(): PlannedExpenseList =
    PlannedExpenseList(
        projectionTotal = money(projectionTotal, currency),
        items = items.map { it.toContract() },
    )

fun CreatedExpense.toContract(): Expense =
    Expense(
        id = id,
        vehicleId = vehicleId,
        date = date,
        amount = money(amount, currency),
        displayAmount = money(displayAmount, displayCurrency),
        category = ContractCategory.valueOf(category.name),
        odometer = odometer,
        note = note,
        createdAt = createdAt.atOffset(ZoneOffset.UTC),
    )

private fun money(
    amount: BigDecimal,
    currency: Currency,
) = Money(amount = amount.setScale(2).toPlainString(), currency = ContractCurrency.valueOf(currency.name))
