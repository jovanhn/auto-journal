package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dao.ExpenseSummaryReadDao
import com.example.autojournal.expenses.internal.dto.ExpenseData
import com.example.autojournal.expenses.internal.dto.ExpenseSummaryView
import com.example.autojournal.expenses.internal.dto.ExpenseView
import com.example.autojournal.expenses.internal.dto.ExpenseYearView
import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.money.ExchangeRates
import com.example.autojournal.users.api.UserProfileApi
import com.example.autojournal.vehicles.api.VehicleApi
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * specs/expenses.md. Every operation is scoped to [ownerId] through the vehicle's owner; another user's
 * vehicle or expense is not found (BR-U2). Sums use full precision in EUR (each expense at its rate snapshot)
 * and are converted to the display currency and rounded only at the end.
 */
@Service
class ExpenseService(
    private val expenseDao: ExpenseDao,
    private val expenseSummaryReadDao: ExpenseSummaryReadDao,
    private val vehicleApi: VehicleApi,
    private val userProfileApi: UserProfileApi,
    private val exchangeRates: ExchangeRates,
    private val clock: Clock,
) {
    /** AC3, AC4, BR-I1. [year] defaults to the current year; 1900 … current year. */
    @Transactional(readOnly = true)
    fun listYear(
        ownerId: UUID,
        vehicleId: UUID,
        year: Int?,
    ): ExpenseYearView {
        ensureVehicleOwned(ownerId, vehicleId)
        val currentYear = LocalDate.now(clock).year
        val selectedYear = year ?: currentYear
        if (selectedYear > currentYear) {
            throw InvalidRequestException(listOf(FieldViolation("year", "must be at most $currentYear")))
        }
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val expenses =
            expenseDao.findInPeriod(vehicleId, LocalDate.of(selectedYear, 1, 1), LocalDate.of(selectedYear, 12, 31))
        val monthTotalsEur = Array(12) { BigDecimal.ZERO }
        expenses.forEach { monthTotalsEur[it.date.monthValue - 1] += it.amountInEur() }
        return ExpenseYearView(
            year = selectedYear,
            firstYear = expenseDao.earliestDate(vehicleId)?.year?.coerceAtMost(currentYear) ?: currentYear,
            currency = displayCurrency,
            yearTotal = fromEur(monthTotalsEur.fold(BigDecimal.ZERO, BigDecimal::add), displayCurrency),
            monthTotals = monthTotalsEur.map { fromEur(it, displayCurrency) },
            expenses = expenses.map { it.toView(displayCurrency) },
        )
    }

    @Transactional(readOnly = true)
    fun get(
        ownerId: UUID,
        expenseId: UUID,
    ): ExpenseView = findOwned(ownerId, expenseId).toView(userProfileApi.displayCurrency(ownerId))

    /** AC1; BR-C4: the rate snapshot is taken now. */
    @Transactional
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        data: ExpenseData,
    ): ExpenseView {
        ensureVehicleOwned(ownerId, vehicleId)
        validate(data)
        val expense =
            ExpenseEntity(
                vehicleId = vehicleId,
                date = data.date,
                amount = data.amount,
                currency = data.currency,
                rateToEur = exchangeRates.rateToEur(data.currency),
                category = data.category,
                odometer = data.odometer,
                note = data.note,
            )
        expenseDao.insert(expense)
        return expense.toView(userProfileApi.displayCurrency(ownerId))
    }

    /** AC7; BR-C4: a new rate snapshot only when the amount or currency changes. */
    @Transactional
    fun update(
        ownerId: UUID,
        expenseId: UUID,
        data: ExpenseData,
    ): ExpenseView {
        val expense = findOwned(ownerId, expenseId)
        validate(data)
        val amountChanged = data.amount.compareTo(expense.amount) != 0 || data.currency != expense.currency
        expense.date = data.date
        expense.amount = data.amount
        expense.currency = data.currency
        if (amountChanged) expense.rateToEur = exchangeRates.rateToEur(data.currency)
        expense.category = data.category
        expense.odometer = data.odometer
        expense.note = data.note
        return expense.toView(userProfileApi.displayCurrency(ownerId))
    }

    /** AC8, BR-E5. */
    @Transactional
    fun delete(
        ownerId: UUID,
        expenseId: UUID,
    ) = expenseDao.delete(findOwned(ownerId, expenseId))

    /** AC10, BR-I6: the current year across all of the owner's vehicles. */
    @Transactional(readOnly = true)
    fun summary(ownerId: UUID): ExpenseSummaryView {
        val today = LocalDate.now(clock)
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val totalsEur =
            expenseSummaryReadDao.totalsInEurByVehicle(ownerId, LocalDate.of(today.year, 1, 1), LocalDate.of(today.year, 12, 31))
        val totalEur = totalsEur.values.fold(BigDecimal.ZERO, BigDecimal::add)
        val monthsElapsed = BigDecimal(today.monthValue)
        return ExpenseSummaryView(
            year = today.year,
            currency = displayCurrency,
            total = fromEur(totalEur, displayCurrency),
            averagePerMonth = fromEur(totalEur.divide(monthsElapsed, AVERAGE_SCALE, RoundingMode.HALF_UP), displayCurrency),
            vehicleTotals = totalsEur.mapValues { (_, eur) -> fromEur(eur, displayCurrency) },
        )
    }

    private fun ensureVehicleOwned(
        ownerId: UUID,
        vehicleId: UUID,
    ) {
        if (!vehicleApi.isOwnedBy(vehicleId, ownerId)) throw NotFoundException("Vehicle", vehicleId)
    }

    private fun findOwned(
        ownerId: UUID,
        expenseId: UUID,
    ): ExpenseEntity =
        expenseDao.find(expenseId)?.takeIf { vehicleApi.isOwnedBy(it.vehicleId, ownerId) }
            ?: throw NotFoundException("Expense", expenseId)

    /** BR-E2: the bound that depends on today's date (UTC). */
    private fun validate(data: ExpenseData) {
        if (data.date.isAfter(LocalDate.now(clock))) {
            throw InvalidRequestException(listOf(FieldViolation("date", "must not be in the future")))
        }
    }

    private fun ExpenseEntity.amountInEur(): BigDecimal = amount.multiply(rateToEur)

    private fun fromEur(
        eur: BigDecimal,
        target: Currency,
    ): BigDecimal = exchangeRates.convert(eur, BigDecimal.ONE, target)

    private fun ExpenseEntity.toView(displayCurrency: Currency) =
        ExpenseView(
            expense = this,
            displayAmount = exchangeRates.convert(amount, rateToEur, displayCurrency),
            displayCurrency = displayCurrency,
        )

    private companion object {
        /** Keeps the average at full precision until it is converted and rounded. */
        const val AVERAGE_SCALE = 16
    }
}
