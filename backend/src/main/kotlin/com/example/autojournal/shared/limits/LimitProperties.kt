package com.example.autojournal.shared.limits

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Configuration
import java.time.LocalDate
import java.time.ZoneOffset

/**
 * Data limits (BR-L1…L7, specs/data-limits.md): count limits checked only on create and value bounds checked on
 * create and edit, both by the owning module's service. Defaults are in `application.yml`; an invalid value
 * stops the backend from starting.
 */
@ConfigurationProperties("autojournal.limits")
class LimitProperties(
    /** BR-L1. */
    val vehiclesPerUser: Int,
    /** BR-L2: expenses and log entries together. */
    val journalEntriesPerVehicle: Int,
    /** BR-L3. */
    val plannedExpensesPerVehicle: Int,
    /** BR-L5, in km. */
    val maxOdometerKm: Int,
    /** BR-L6. */
    val maxRecurrenceMonths: Int,
    /** BR-L7: purchase and journal entry dates are on or after this date. */
    val earliestDate: LocalDate,
    /** BR-L7: a planned due date is at most this many years after today. */
    val plannedYearsAhead: Int,
) {
    init {
        mapOf(
            "vehicles-per-user" to vehiclesPerUser,
            "journal-entries-per-vehicle" to journalEntriesPerVehicle,
            "planned-expenses-per-vehicle" to plannedExpensesPerVehicle,
            "max-odometer-km" to maxOdometerKm,
            "max-recurrence-months" to maxRecurrenceMonths,
            "planned-years-ahead" to plannedYearsAhead,
        ).forEach { (name, value) -> require(value >= 1) { "autojournal.limits.$name must be at least 1, was $value" } }
        require(!earliestDate.isAfter(LocalDate.now(ZoneOffset.UTC))) {
            "autojournal.limits.earliest-date must not be in the future, was $earliestDate"
        }
    }
}

@Configuration
@EnableConfigurationProperties(LimitProperties::class)
class LimitConfiguration
