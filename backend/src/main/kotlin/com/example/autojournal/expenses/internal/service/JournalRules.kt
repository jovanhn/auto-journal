package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dto.JournalEntry
import com.example.autojournal.shared.error.DomainRuleViolationException
import com.example.autojournal.shared.error.FieldViolation
import com.example.autojournal.shared.error.InvalidRequestException
import com.example.autojournal.shared.error.NotFoundException
import com.example.autojournal.shared.limits.LimitProperties
import com.example.autojournal.vehicles.api.VehicleApi
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.LocalDate
import java.util.UUID

/**
 * Rules shared by expenses and log entries (specs/journal.md): ownership (BR-U2), date and odometer bounds
 * (BR-E2, BR-L5, BR-L7) and the journal entry limit (BR-L2). Called inside the services' transactions.
 */
@Component
class JournalRules(
    private val expenseDao: ExpenseDao,
    private val vehicleApi: VehicleApi,
    private val limits: LimitProperties,
    private val clock: Clock,
) {
    fun ensureVehicleOwned(
        ownerId: UUID,
        vehicleId: UUID,
    ) {
        if (!vehicleApi.isOwnedBy(vehicleId, ownerId)) throw NotFoundException("Vehicle", vehicleId)
    }

    /** The owner's journal entry of the kind [isExpense]; anything else is not found as [resource] (BR-U2). */
    fun findOwned(
        ownerId: UUID,
        id: UUID,
        isExpense: Boolean,
        resource: String,
    ): JournalEntry =
        expenseDao
            .find(id)
            ?.takeIf { (it.cost != null) == isExpense && vehicleApi.isOwnedBy(it.entry.vehicleId, ownerId) }
            ?: throw NotFoundException(resource, id)

    /** BR-E2: the bound that depends on today's date (UTC); BR-L5, BR-L7: the configured bounds. */
    fun violations(
        date: LocalDate,
        odometer: Int?,
    ): List<FieldViolation> =
        listOfNotNull(
            FieldViolation("date", "must not be in the future").takeIf { date.isAfter(LocalDate.now(clock)) },
            FieldViolation("date", "must be on or after ${limits.earliestDate}").takeIf { date.isBefore(limits.earliestDate) },
            FieldViolation("odometer", "must be at most ${limits.maxOdometerKm}")
                .takeIf { odometer != null && odometer > limits.maxOdometerKm },
        )

    fun validate(
        date: LocalDate,
        odometer: Int?,
        extra: List<FieldViolation> = emptyList(),
    ) {
        val errors = violations(date, odometer) + extra
        if (errors.isNotEmpty()) throw InvalidRequestException(errors)
    }

    /** BR-L2, BR-L4: expenses and log entries count together; checked only when adding (also through mark as paid). */
    fun ensureBelowJournalEntryLimit(vehicleId: UUID) {
        if (expenseDao.countByVehicle(vehicleId) >= limits.journalEntriesPerVehicle) {
            throw DomainRuleViolationException("A vehicle can have at most ${limits.journalEntriesPerVehicle} journal entries.")
        }
    }
}
