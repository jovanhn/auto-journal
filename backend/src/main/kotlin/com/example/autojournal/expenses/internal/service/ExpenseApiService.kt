package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.api.CreatedExpense
import com.example.autojournal.expenses.api.ExpenseApi
import com.example.autojournal.expenses.api.NewExpense
import com.example.autojournal.expenses.internal.dto.ExpenseData
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/** Implements the module's public [ExpenseApi] on top of [ExpenseService]. */
@Service
class ExpenseApiService(
    private val expenseService: ExpenseService,
) : ExpenseApi {
    @Transactional
    override fun create(
        ownerId: UUID,
        vehicleId: UUID,
        expense: NewExpense,
    ): CreatedExpense {
        val data =
            ExpenseData(
                date = expense.date,
                amount = expense.amount,
                currency = expense.currency,
                category = expense.category,
                odometer = expense.odometer,
                note = expense.note,
                approximate = expense.approximate,
            )
        val view = expenseService.create(ownerId, vehicleId, data)
        return CreatedExpense(
            id = view.entry.id,
            vehicleId = view.entry.vehicleId,
            date = view.entry.date,
            amount = view.cost.amount,
            currency = view.cost.currency,
            displayAmount = view.displayAmount,
            displayCurrency = view.displayCurrency,
            category = view.cost.category,
            odometer = view.entry.odometer,
            note = view.entry.note,
            approximate = view.cost.approximate,
            createdAt = view.entry.createdAt,
        )
    }
}
