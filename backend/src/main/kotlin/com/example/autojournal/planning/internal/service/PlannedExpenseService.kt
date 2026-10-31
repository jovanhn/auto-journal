package com.example.autojournal.planning.internal.service

import com.example.autojournal.expenses.api.CreatedExpense
import com.example.autojournal.expenses.api.ExpenseApi
import com.example.autojournal.expenses.api.NewExpense
import com.example.autojournal.planning.internal.dao.NextDuePlannedExpenseReadDao
import com.example.autojournal.planning.internal.dao.PlannedExpenseDao
import com.example.autojournal.planning.internal.dto.PlannedExpenseData
import com.example.autojournal.planning.internal.dto.PlannedExpenseListView
import com.example.autojournal.planning.internal.dto.PlannedExpenseView
import com.example.autojournal.planning.internal.entity.PlannedExpenseEntity
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.money.ExchangeRates
import com.example.autojournal.users.api.UserProfileApi
import com.example.autojournal.vehicles.api.VehicleApi
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * specs/planned-expenses.md. Every operation is scoped to [ownerId] through the vehicle's owner; another user's
 * vehicle or plan is not found (BR-U2). Estimates are converted with the current configured rates (BR-C5);
 * "today" is the server's date in UTC.
 */
@Service
class PlannedExpenseService(
    private val plannedExpenseDao: PlannedExpenseDao,
    private val nextDueReadDao: NextDuePlannedExpenseReadDao,
    private val vehicleApi: VehicleApi,
    private val expenseApi: ExpenseApi,
    private val userProfileApi: UserProfileApi,
    private val exchangeRates: ExchangeRates,
    private val clock: Clock,
) {
    /** AC3, AC4, AC11. */
    @Transactional(readOnly = true)
    fun list(
        ownerId: UUID,
        vehicleId: UUID,
    ): PlannedExpenseListView {
        ensureVehicleOwned(ownerId, vehicleId)
        val today = LocalDate.now(clock)
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val plans = plannedExpenseDao.findByVehicle(vehicleId)
        val projectionEur =
            plans.fold(BigDecimal.ZERO) { sum, plan ->
                sum + plan.amountInEur().multiply(BigDecimal(occurrencesInProjection(plan, today)))
            }
        return PlannedExpenseListView(
            currency = displayCurrency,
            projectionTotal = exchangeRates.convert(projectionEur, BigDecimal.ONE, displayCurrency),
            items = plans.map { it.toView(displayCurrency, today) },
        )
    }

    /** AC10: the earliest plan of each of the owner's vehicles that has plans. */
    @Transactional(readOnly = true)
    fun nextDue(ownerId: UUID): List<PlannedExpenseView> {
        val ids = nextDueReadDao.nextDueIds(ownerId)
        if (ids.isEmpty()) return emptyList()
        val today = LocalDate.now(clock)
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        return plannedExpenseDao
            .findAll(ids)
            .sortedWith(compareBy({ it.dueDate }, { it.createdAt }))
            .map { it.toView(displayCurrency, today) }
    }

    /** AC1. */
    @Transactional
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        data: PlannedExpenseData,
    ): PlannedExpenseView {
        ensureVehicleOwned(ownerId, vehicleId)
        val plan =
            PlannedExpenseEntity(
                vehicleId = vehicleId,
                category = data.category,
                estimatedAmount = data.estimatedAmount,
                currency = data.currency,
                dueDate = data.dueDate,
                recurrenceMonths = data.recurrenceMonths,
                note = data.note,
            )
        plannedExpenseDao.insert(plan)
        return plan.toView(userProfileApi.displayCurrency(ownerId), LocalDate.now(clock))
    }

    /** AC9, BR-PL4. */
    @Transactional
    fun update(
        ownerId: UUID,
        plannedExpenseId: UUID,
        data: PlannedExpenseData,
    ): PlannedExpenseView {
        val plan = findOwned(ownerId, plannedExpenseId)
        plan.category = data.category
        plan.estimatedAmount = data.estimatedAmount
        plan.currency = data.currency
        plan.dueDate = data.dueDate
        plan.recurrenceMonths = data.recurrenceMonths
        plan.note = data.note
        return plan.toView(userProfileApi.displayCurrency(ownerId), LocalDate.now(clock))
    }

    /** AC9, BR-PL4. */
    @Transactional
    fun delete(
        ownerId: UUID,
        plannedExpenseId: UUID,
    ) = plannedExpenseDao.delete(findOwned(ownerId, plannedExpenseId))

    /**
     * AC5–AC8, BR-PL2, BR-PL3: creates the expense with the plan's category, then removes a one-time plan or
     * moves a recurring one forward from its due date (not from today), all in one transaction. An invalid
     * expense throws before the plan is touched.
     */
    @Transactional
    fun pay(
        ownerId: UUID,
        plannedExpenseId: UUID,
        expense: NewExpense,
    ): CreatedExpense {
        val plan = findOwned(ownerId, plannedExpenseId)
        val created = expenseApi.create(ownerId, plan.vehicleId, expense.copy(category = plan.category))
        val months = plan.recurrenceMonths
        if (months == null) {
            plannedExpenseDao.delete(plan)
        } else {
            // plusMonths clamps to the month's last day (Jan 31 → Feb 28/29); later moves start from there (accepted).
            plan.dueDate = plan.dueDate.plusMonths(months.toLong())
        }
        return created
    }

    private fun ensureVehicleOwned(
        ownerId: UUID,
        vehicleId: UUID,
    ) {
        if (!vehicleApi.isOwnedBy(vehicleId, ownerId)) throw NotFoundException("Vehicle", vehicleId)
    }

    private fun findOwned(
        ownerId: UUID,
        plannedExpenseId: UUID,
    ): PlannedExpenseEntity =
        plannedExpenseDao.find(plannedExpenseId)?.takeIf { vehicleApi.isOwnedBy(it.vehicleId, ownerId) }
            ?: throw NotFoundException("Planned expense", plannedExpenseId)

    private fun PlannedExpenseEntity.amountInEur(): BigDecimal = estimatedAmount.multiply(exchangeRates.rateToEur(currency))

    private fun PlannedExpenseEntity.toView(
        displayCurrency: Currency,
        today: LocalDate,
    ) = PlannedExpenseView(
        plan = this,
        displayAmount = exchangeRates.convert(estimatedAmount, exchangeRates.rateToEur(currency), displayCurrency),
        displayCurrency = displayCurrency,
        dueSoon = isDueSoon(dueDate, today),
    )

    companion object {
        private const val DUE_SOON_DAYS = 30L
        private const val PROJECTION_MONTHS = 12L

        /** BR-PL6: due within the next 30 days, or overdue. */
        fun isDueSoon(
            dueDate: LocalDate,
            today: LocalDate,
        ): Boolean = !dueDate.isAfter(today.plusDays(DUE_SOON_DAYS))

        /**
         * BR-I5: how often [plan] falls due in the 12 calendar months from the current one. Occurrences are the
         * due date + k·N months; the ones before [today] (overdue) count once, in the current month.
         */
        fun occurrencesInProjection(
            plan: PlannedExpenseEntity,
            today: LocalDate,
        ): Int {
            val windowEnd = today.withDayOfMonth(1).plusMonths(PROJECTION_MONTHS).minusDays(1)
            val months = plan.recurrenceMonths ?: return if (plan.dueDate.isAfter(windowEnd)) 0 else 1
            var count = if (plan.dueDate.isBefore(today)) 1 else 0
            var k = 0L
            while (true) {
                val occurrence = plan.dueDate.plusMonths(k * months)
                if (occurrence.isAfter(windowEnd)) return count
                if (!occurrence.isBefore(today)) count++
                k++
            }
        }
    }
}
