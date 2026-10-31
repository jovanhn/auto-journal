package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dto.CategoryTotalView
import com.example.autojournal.expenses.internal.dto.VehicleInsightsView
import com.example.autojournal.expenses.internal.entity.Category
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
 * specs/insights.md. Year figures (BR-I1…I3) come from the vehicle's expenses dated in the year; lifetime
 * figures (BR-I4, BR-V7) from all of its expenses and its purchase price. Sums use full precision in EUR (each
 * amount at its rate snapshot) and are converted to the display currency and rounded only at the end.
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
        val expenses =
            expenseDao.findInPeriod(vehicleId, LocalDate.of(selectedYear, 1, 1), LocalDate.of(selectedYear, 12, 31))

        val monthTotalsEur = Array(12) { BigDecimal.ZERO }
        val categoryTotalsEur = sortedMapOf<Category, BigDecimal>()
        expenses.forEach {
            val eur = it.amount.multiply(it.rateToEur)
            monthTotalsEur[it.date.monthValue - 1] += eur
            categoryTotalsEur.merge(it.category, eur, BigDecimal::add)
        }
        val totalEur = monthTotalsEur.fold(BigDecimal.ZERO, BigDecimal::add)
        // BR-I3: 12 for a past year, January through the current month for the current year.
        val monthsElapsed = if (selectedYear == today.year) today.monthValue else 12

        val purchasePriceEur = vehicle.purchasePriceAmount.multiply(vehicle.purchasePriceRateToEur)
        val distanceKm = vehicle.currentOdometer - vehicle.odometerAtStart
        val costPerKm =
            if (distanceKm > 0) {
                val lifetimeEur = expenseDao.lifetimeTotalInEur(vehicleId) + purchasePriceEur
                fromEur(lifetimeEur.divide(BigDecimal(distanceKm), SCALE, RoundingMode.HALF_UP), displayCurrency)
            } else {
                null
            }

        return VehicleInsightsView(
            year = selectedYear,
            firstYear = expenseDao.earliestDate(vehicleId)?.year?.coerceAtMost(today.year) ?: today.year,
            currency = displayCurrency,
            total = fromEur(totalEur, displayCurrency),
            averagePerMonth =
                fromEur(totalEur.divide(BigDecimal(monthsElapsed), SCALE, RoundingMode.HALF_UP), displayCurrency),
            monthTotals = monthTotalsEur.map { fromEur(it, displayCurrency) },
            // BR-I2: highest total first; equal totals keep the fixed category order.
            categories =
                categoryTotalsEur.entries
                    .sortedByDescending { it.value }
                    .map { (category, eur) ->
                        CategoryTotalView(category, fromEur(eur, displayCurrency), sharePercent(eur, totalEur))
                    },
            carValue = fromEur(purchasePriceEur, displayCurrency),
            distanceKm = distanceKm,
            costPerKm = costPerKm,
        )
    }

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

    private companion object {
        /** Keeps quotients at full precision until they are converted and rounded. */
        const val SCALE = 16
        val HUNDRED = BigDecimal(100)
    }
}
