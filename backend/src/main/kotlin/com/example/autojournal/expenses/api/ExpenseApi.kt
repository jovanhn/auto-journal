package com.example.autojournal.expenses.api

import com.example.autojournal.shared.money.Currency
import java.math.BigDecimal
import java.time.Instant
import java.time.LocalDate
import java.util.UUID

/** What other modules may do with expenses. */
interface ExpenseApi {
    /**
     * Adds an expense to [vehicleId] of [ownerId] with a rate snapshot taken now (BR-C4), joining the caller's
     * transaction. Throws `NotFoundException` when the vehicle is missing or someone else's (BR-U2) and
     * `InvalidRequestException` when the expense breaks a rule only the server can check (BR-E2).
     */
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        expense: NewExpense,
    ): CreatedExpense
}

/** An expense to add; the note is already trimmed (blank = null). */
data class NewExpense(
    val date: LocalDate,
    val amount: BigDecimal,
    val currency: Currency,
    val category: Category,
    val odometer: Int?,
    val note: String?,
)

/** An added expense with its amount in the owner's display currency (BR-C6). */
data class CreatedExpense(
    val id: UUID,
    val vehicleId: UUID,
    val date: LocalDate,
    val amount: BigDecimal,
    val currency: Currency,
    val displayAmount: BigDecimal,
    val displayCurrency: Currency,
    val category: Category,
    val odometer: Int?,
    val note: String?,
    val createdAt: Instant,
)
