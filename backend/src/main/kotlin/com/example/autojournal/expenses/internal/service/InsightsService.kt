package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.api.Category
import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dto.CategoryTotalView
import com.example.autojournal.expenses.internal.dto.JournalEntry
import com.example.autojournal.expenses.internal.dto.VehicleAllTimeInsightsView
import com.example.autojournal.expenses.internal.dto.VehicleInsightsView
import com.example.autojournal.expenses.internal.dto.YearTotalView
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.money.Currency
import com.example.autojournal.shared.money.ExchangeRates
import com.example.autojournal.users.api.UserProfileApi
import com.example.autojournal.vehicles.api.VehicleApi
import com.example.autojournal.vehicles.api.VehicleFacts
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.math.RoundingMode
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * specs/insights.md. Year figures (BR-I1…I3, I8) come from the vehicle's expenses dated in the year;
 * all-time figures (BR-I9) and lifetime figures (BR-I4, BR-V7) from all of its expenses and its purchase price.
 * Log entries never count in money (BR-J3); distances use every journal entry's odometer reading (BR-I7).
 * Sums use full precision in EUR (each amount at its rate snapshot) and are converted to the display currency
 * and rounded only at the end.
 */
@Service
class InsightsService(
    private val expenseDao: ExpenseDao,
    private val vehicleApi: VehicleApi,
    private val userProfileApi: UserProfileApi,
    private val exchangeRates: ExchangeRates,
    private val clock: Clock,
) {
    @Transactional(readOnly = true)
    fun insights(
        ownerId: UUID,
        vehicleId: UUID,
        year: Int?,
    ): VehicleInsightsView {
        val vehicle = vehicleApi.findOwned(vehicleId, ownerId) ?: throw NotFoundException("Vehicle", vehicleId)
        val today = LocalDate.now(clock)
        val selectedYear = year ?: today.year
        if (selectedYear > today.year) {
            throw InvalidRequestException(listOf(FieldViolation("year", "must be at most ${today.year}")))
        }
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val journal = expenseDao.findAllByVehicle(vehicleId)
        val all = journal.costs()
        val expenses = all.filter { it.date.year == selectedYear }

        val monthTotalsEur = Array(12) { BigDecimal.ZERO }
        expenses.forEach { monthTotalsEur[it.date.monthValue - 1] += it.eur }
        val totalEur = monthTotalsEur.fold(BigDecimal.ZERO, BigDecimal::add)
        // BR-I3: 12 for a past year, January through the current month for the current year.
        val monthsElapsed = if (selectedYear == today.year) today.monthValue else 12

        val yearDistanceKm = yearDistanceKm(vehicle, journal, selectedYear)
        val yearCostPerKm =
            if (yearDistanceKm != null && yearDistanceKm > 0) perKm(totalEur, yearDistanceKm, displayCurrency) else null

        return VehicleInsightsView(
            year = selectedYear,
            firstYear = firstYear(all, today),
            currency = displayCurrency,
            total = fromEur(totalEur, displayCurrency),
            averagePerMonth = average(totalEur, monthsElapsed, displayCurrency),
            monthTotals = monthTotalsEur.map { fromEur(it, displayCurrency) },
            categories = categories(expenses, totalEur, displayCurrency),
            carValue = fromEur(vehicle.purchasePriceEur(), displayCurrency),
            distanceKm = vehicle.distanceKm(),
            costPerKm = lifetimeCostPerKm(vehicle, all, displayCurrency),
            yearDistanceKm = yearDistanceKm,
            yearCostPerKm = yearCostPerKm,
        )
    }

    @Transactional(readOnly = true)
    fun allTime(
        ownerId: UUID,
        vehicleId: UUID,
    ): VehicleAllTimeInsightsView {
        val vehicle = vehicleApi.findOwned(vehicleId, ownerId) ?: throw NotFoundException("Vehicle", vehicleId)
        val today = LocalDate.now(clock)
        val displayCurrency = userProfileApi.displayCurrency(ownerId)
        val all = expenseDao.findAllByVehicle(vehicleId).costs()
        val firstYear = firstYear(all, today)

        val yearTotalsEur = (firstYear..today.year).associateWith { BigDecimal.ZERO }.toMutableMap()
        all.forEach { yearTotalsEur.merge(it.date.year, it.eur, BigDecimal::add) }
        val totalEur = all.fold(BigDecimal.ZERO) { sum, expense -> sum + expense.eur }

        // BR-I9: months from the earlier of the purchase date and the first expense, through the current month.
        val start = listOfNotNull(vehicle.purchaseDate, all.minOfOrNull { it.date }).min()
        val months = (today.year - start.year) * 12 + today.monthValue - start.monthValue + 1

        return VehicleAllTimeInsightsView(
            firstYear = firstYear,
            currency = displayCurrency,
            total = fromEur(totalEur, displayCurrency),
            averagePerMonth = average(totalEur, months.coerceAtLeast(1), displayCurrency),
            yearTotals = yearTotalsEur.toSortedMap().map { (year, eur) -> YearTotalView(year, fromEur(eur, displayCurrency)) },
            categories = categories(all, totalEur, displayCurrency),
            carValue = fromEur(vehicle.purchasePriceEur(), displayCurrency),
            distanceKm = vehicle.distanceKm(),
            costPerKm = lifetimeCostPerKm(vehicle, all, displayCurrency),
        )
    }

    /**
     * BR-I7: odometer at the end of [year] − odometer at the end of the year before, each the highest of the
     * odometer at start and the journal entry readings dated up to then; null when no journal entry in [year] has a
     * reading.
     */
    private fun yearDistanceKm(
        vehicle: VehicleFacts,
        journal: List<JournalEntry>,
        year: Int,
    ): Int? {
        val entries = journal.map { it.entry }
        if (entries.none { it.date.year == year && it.odometer != null }) return null

        fun odometerAtEndOf(y: Int) =
            entries
                .filter { it.date.year <= y }
                .mapNotNull { it.odometer }
                .fold(vehicle.odometerAtStart, ::maxOf)
        return odometerAtEndOf(year) - odometerAtEndOf(year - 1)
    }

    /** BR-I4: (all expenses + purchase price) ÷ distance driven; null at 0 km. */
    private fun lifetimeCostPerKm(
        vehicle: VehicleFacts,
        expenses: List<Cost>,
        currency: Currency,
    ): BigDecimal? {
        val distanceKm = vehicle.distanceKm()
        if (distanceKm <= 0) return null
        val lifetimeEur = expenses.fold(vehicle.purchasePriceEur()) { sum, expense -> sum + expense.eur }
        return perKm(lifetimeEur, distanceKm, currency)
    }

    /** BR-I2: highest total first; equal totals keep the fixed category order. */
    private fun categories(
        expenses: List<Cost>,
        totalEur: BigDecimal,
        currency: Currency,
    ): List<CategoryTotalView> {
        val totalsEur = sortedMapOf<Category, BigDecimal>()
        expenses.forEach { totalsEur.merge(it.category, it.eur, BigDecimal::add) }
        return totalsEur.entries
            .sortedByDescending { it.value }
            .map { (category, eur) -> CategoryTotalView(category, fromEur(eur, currency), sharePercent(eur, totalEur)) }
    }

    private fun firstYear(
        expenses: List<Cost>,
        today: LocalDate,
    ): Int = expenses.minOfOrNull { it.date.year }?.coerceAtMost(today.year) ?: today.year

    private fun average(
        totalEur: BigDecimal,
        months: Int,
        currency: Currency,
    ): BigDecimal = fromEur(totalEur.divide(BigDecimal(months), SCALE, RoundingMode.HALF_UP), currency)

    private fun perKm(
        eur: BigDecimal,
        distanceKm: Int,
        currency: Currency,
    ): BigDecimal = fromEur(eur.divide(BigDecimal(distanceKm), SCALE, RoundingMode.HALF_UP), currency)

    /** Whole percent, rounded half-up; shares may not add up to exactly 100 (specs/insights.md edge cases). */
    private fun sharePercent(
        part: BigDecimal,
        total: BigDecimal,
    ): Int =
        if (total.signum() == 0) {
            0
        } else {
            part.multiply(HUNDRED).divide(total, 0, RoundingMode.HALF_UP).toInt()
        }

    private fun fromEur(
        eur: BigDecimal,
        target: Currency,
    ): BigDecimal = exchangeRates.convert(eur, BigDecimal.ONE, target)

    /** An expense's money facts: date, category and amount in EUR at its rate snapshot. */
    private data class Cost(
        val date: LocalDate,
        val category: Category,
        val eur: BigDecimal,
    )

    /** The expenses only (BR-J3). */
    private fun List<JournalEntry>.costs(): List<Cost> =
        mapNotNull { (entry, cost) -> cost?.let { Cost(entry.date, it.category, it.amount.multiply(it.rateToEur)) } }

    private fun VehicleFacts.purchasePriceEur(): BigDecimal = purchasePriceAmount.multiply(purchasePriceRateToEur)

    private fun VehicleFacts.distanceKm(): Int = currentOdometer - odometerAtStart

    private companion object {
        /** Keeps quotients at full precision until they are converted and rounded. */
        const val SCALE = 16
        val HUNDRED = BigDecimal(100)
    }
}
