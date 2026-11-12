package com.example.autojournal.shared

import com.example.autojournal.shared.limits.LimitConfiguration
import com.example.autojournal.shared.limits.LimitProperties
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import java.time.LocalDate
import java.time.ZoneOffset
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotNull

/** specs/data-limits.md AC 9: invalid limits stop the backend from starting. */
class LimitPropertiesTest {
    private fun limits(
        vehiclesPerUser: Int = 10,
        plannedYearsAhead: Int = 10,
        earliestDate: LocalDate = LocalDate.of(1900, 1, 1),
    ) = LimitProperties(
        vehiclesPerUser = vehiclesPerUser,
        journalEntriesPerVehicle = 3000,
        plannedExpensesPerVehicle = 50,
        issuesPerVehicle = 200,
        maxOdometerKm = 2_000_000,
        maxRecurrenceMonths = 120,
        earliestDate = earliestDate,
        plannedYearsAhead = plannedYearsAhead,
    )

    @Test
    fun `defaults are valid`() {
        assertEquals(10, limits().vehiclesPerUser)
    }

    @Test
    fun `a number below 1 is rejected`() {
        val ex = assertFailsWith<IllegalArgumentException> { limits(vehiclesPerUser = 0) }
        assertEquals("autojournal.limits.vehicles-per-user must be at least 1, was 0", ex.message)
        assertFailsWith<IllegalArgumentException> { limits(plannedYearsAhead = -1) }
    }

    @Test
    fun `an earliest date in the future is rejected`() {
        assertFailsWith<IllegalArgumentException> { limits(earliestDate = LocalDate.now(ZoneOffset.UTC).plusDays(1)) }
        assertNotNull(limits(earliestDate = LocalDate.now(ZoneOffset.UTC)))
    }

    private val runner =
        ApplicationContextRunner()
            .withUserConfiguration(LimitConfiguration::class.java)
            .withPropertyValues(
                "autojournal.limits.vehicles-per-user=10",
                "autojournal.limits.journal-entries-per-vehicle=3000",
                "autojournal.limits.planned-expenses-per-vehicle=50",
                "autojournal.limits.issues-per-vehicle=200",
                "autojournal.limits.max-odometer-km=2000000",
                "autojournal.limits.max-recurrence-months=120",
                "autojournal.limits.earliest-date=1900-01-01",
                "autojournal.limits.planned-years-ahead=10",
            )

    @Test
    fun `configured values are bound`() {
        runner.withPropertyValues("autojournal.limits.vehicles-per-user=3").run {
            assertThat(it).hasNotFailed()
            assertEquals(3, it.getBean(LimitProperties::class.java).vehiclesPerUser)
        }
    }

    @Test
    fun `an invalid value stops the context from starting`() {
        runner.withPropertyValues("autojournal.limits.vehicles-per-user=0").run { assertThat(it).hasFailed() }
        runner.withPropertyValues("autojournal.limits.earliest-date=not-a-date").run { assertThat(it).hasFailed() }
        runner.withPropertyValues("autojournal.limits.max-odometer-km=lots").run { assertThat(it).hasFailed() }
    }
}
