package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dao.ExpenseSummaryReadDao
import com.example.autojournal.expenses.internal.dto.ExpenseData
import com.example.autojournal.expenses.internal.dto.ExpenseSummaryView
import com.example.autojournal.expenses.internal.dto.ExpenseView
import com.example.autojournal.expenses.internal.dto.ExpenseYearView
import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.money.ExchangeRates
import com.example.autojournal.users.api.UserProfileApi
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * specs/expenses.md, specs/journal.md. Every operation is scoped to [ownerId] through the vehicle's owner; another
 * user's vehicle or expense is not found (BR-U2). An expense is a journal entry with a cost (ADR 0020). Sums use
 * full precision in EUR (each expense at its rate snapshot) and are converted to the display currency and rounded
 * only at the end.
 */
@Service
class ExpenseService(
    private val expenseDao: ExpenseDao,
    private val expenseSummaryReadDao: ExpenseSummaryReadDao,
    private val rules: JournalRules,
    private val userProfileApi: UserProfileApi,
    private val exchangeRates: ExchangeRates,
    private val clock: Clock,
) {
    /** The journal of a year (BR-J1, BR-I1); totals from expenses only (BR-J3). [year]: 1900 … current year. */
    @Transactional(readOnly = true)
    fun listYear(
        ownerId: UUID,
        vehicleId: UUID,
        year: Int?,
    ): ExpenseYearView {
        rules.ensureVehicleOwned(ownerId, vehicleId)
        val currentYear = LocalDate.now(clock).year
        val selectedYear = year ?: currentYear
        if (selectedYear > currentYear) {
            throw InvalidRequestException(listOf(FieldViolation("year", "must be at most $currentYear")))
        }
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val entries =
            expenseDao.findInPeriod(vehicleId, LocalDate.of(selectedYear, 1, 1), LocalDate.of(selectedYear, 12, 31))
        val expenses = entries.mapNotNull { (entry, cost) -> cost?.let { entry to it } }
        val monthTotalsEur = Array(12) { BigDecimal.ZERO }
        expenses.forEach { (entry, cost) -> monthTotalsEur[entry.date.monthValue - 1] += cost.amountInEur() }
        return ExpenseYearView(
            year = selectedYear,
            firstYear = expenseDao.earliestDate(vehicleId)?.year?.coerceAtMost(currentYear) ?: currentYear,
            currency = displayCurrency,
            yearTotal = fromEur(monthTotalsEur.fold(BigDecimal.ZERO, BigDecimal::add), displayCurrency),
            monthTotals = monthTotalsEur.map { fromEur(it, displayCurrency) },
            expenses = expenses.map { (entry, cost) -> view(entry, cost, displayCurrency) },
            logEntries = entries.filter { it.cost == null }.map { it.entry },
        )
    }

    @Transactional(readOnly = true)
    fun get(
        ownerId: UUID,
        expenseId: UUID,
    ): ExpenseView {
        val (entry, cost) = findOwned(ownerId, expenseId)
        return view(entry, cost, userProfileApi.displayCurrency(ownerId))
    }

    /** AC1; BR-C4: the rate snapshot is taken now; BR-L2: the limit counts journal entries. */
    @Transactional
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        data: ExpenseData,
    ): ExpenseView {
        rules.ensureVehicleOwned(ownerId, vehicleId)
        rules.validate(data.date, data.odometer)
        rules.ensureBelowJournalEntryLimit(vehicleId)
        val entry = JournalEntryEntity(vehicleId = vehicleId, date = data.date, odometer = data.odometer, note = data.note)
        val cost = newCost(entry.id, data)
        expenseDao.insert(entry, cost)
        return view(entry, cost, userProfileApi.displayCurrency(ownerId))
    }

    /** AC7; BR-C4: a new rate snapshot only when the amount or currency changes. */
    @Transactional
    fun update(
        ownerId: UUID,
        expenseId: UUID,
        data: ExpenseData,
    ): ExpenseView {
        val (entry, cost) = findOwned(ownerId, expenseId)
        rules.validate(data.date, data.odometer)
        val amountChanged = data.amount.compareTo(cost.amount) != 0 || data.currency != cost.currency
        entry.update(data)
        cost.amount = data.amount
        cost.currency = data.currency
        if (amountChanged) cost.rateToEur = exchangeRates.rateToEur(data.currency)
        cost.category = data.category
        cost.approximate = data.approximate
        return view(entry, cost, userProfileApi.displayCurrency(ownerId))
    }

    /** AC8, BR-E5; specs/journal.md AC10: its journal entry goes too. */
    @Transactional
    fun delete(
        ownerId: UUID,
        expenseId: UUID,
    ) = expenseDao.delete(rules.findOwned(ownerId, expenseId, isExpense = true, resource = EXPENSE))

    /**
     * BR-J5: the log entry becomes an expense with the same id and all fields from [data], with a new rate snapshot.
     * Not an addition, so the journal entry limit does not apply (BR-L4).
     */
    @Transactional
    fun convertLogEntry(
        ownerId: UUID,
        logEntryId: UUID,
        data: ExpenseData,
    ): ExpenseView {
        val entry = rules.findOwned(ownerId, logEntryId, isExpense = false, resource = LOG_ENTRY).entry
        rules.validate(data.date, data.odometer)
        entry.update(data)
        val cost = expenseDao.insertCost(newCost(entry.id, data))
        return view(entry, cost, userProfileApi.displayCurrency(ownerId))
    }

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

    private fun findOwned(
        ownerId: UUID,
        expenseId: UUID,
    ): Pair<JournalEntryEntity, ExpenseEntity> {
        val found = rules.findOwned(ownerId, expenseId, isExpense = true, resource = EXPENSE)
        return found.entry to checkNotNull(found.cost)
    }

    private fun newCost(
        id: UUID,
        data: ExpenseData,
    ) = ExpenseEntity(
        id = id,
        amount = data.amount,
        currency = data.currency,
        rateToEur = exchangeRates.rateToEur(data.currency),
        category = data.category,
        approximate = data.approximate,
    )

    private fun JournalEntryEntity.update(data: ExpenseData) {
        date = data.date
        odometer = data.odometer
        note = data.note
    }

    private fun ExpenseEntity.amountInEur(): BigDecimal = amount.multiply(rateToEur)

    private fun fromEur(
        eur: BigDecimal,
        target: Currency,
    ): BigDecimal = exchangeRates.convert(eur, BigDecimal.ONE, target)

    private fun view(
        entry: JournalEntryEntity,
        cost: ExpenseEntity,
        displayCurrency: Currency,
    ) = ExpenseView(
        entry = entry,
        cost = cost,
        displayAmount = exchangeRates.convert(cost.amount, cost.rateToEur, displayCurrency),
        displayCurrency = displayCurrency,
    )

    private companion object {
        /** Keeps the average at full precision until it is converted and rounded. */
        const val AVERAGE_SCALE = 16
        const val EXPENSE = "Expense"
        const val LOG_ENTRY = "Log entry"
    }
}
