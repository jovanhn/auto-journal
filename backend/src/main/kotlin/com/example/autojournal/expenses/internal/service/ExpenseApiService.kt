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
            )
        val view = expenseService.create(ownerId, vehicleId, data)
        return with(view.expense) {
            CreatedExpense(
                id = id,
                vehicleId = vehicleId,
                date = date,
                amount = amount,
                currency = currency,
                displayAmount = view.displayAmount,
                displayCurrency = view.displayCurrency,
                category = category,
                odometer = odometer,
                note = note,
                createdAt = createdAt,
            )
        }
    }
}
