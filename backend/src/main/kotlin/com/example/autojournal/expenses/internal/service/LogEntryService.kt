package com.example.autojournal.expenses.internal.service

import com.example.autojournal.expenses.internal.dao.ExpenseDao
import com.example.autojournal.expenses.internal.dto.LogEntryData
import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
import com.example.autojournal.shared.error.FieldViolation
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

/**
 * specs/journal.md: log entries, journal entries without a cost (ADR 0020). Scoped to [ownerId] like expenses
 * (BR-U2); an expense's id is not a log entry (404).
 */
@Service
class LogEntryService(
    private val expenseDao: ExpenseDao,
    private val rules: JournalRules,
) {
    /** AC1–4, BR-J2; BR-L2: the limit counts journal entries. */
    @Transactional
    fun create(
        ownerId: UUID,
        vehicleId: UUID,
        data: LogEntryData,
    ): JournalEntryEntity {
        rules.ensureVehicleOwned(ownerId, vehicleId)
        validate(data)
        rules.ensureBelowJournalEntryLimit(vehicleId)
        val entry = JournalEntryEntity(vehicleId = vehicleId, date = data.date, odometer = data.odometer, note = data.note)
        expenseDao.insert(entry, cost = null)
        return entry
    }

    @Transactional(readOnly = true)
    fun get(
        ownerId: UUID,
        logEntryId: UUID,
    ): JournalEntryEntity = rules.findOwned(ownerId, logEntryId, isExpense = false, resource = LOG_ENTRY).entry

    /** AC8, BR-J4: replaces all fields. */
    @Transactional
    fun update(
        ownerId: UUID,
        logEntryId: UUID,
        data: LogEntryData,
    ): JournalEntryEntity {
        val entry = rules.findOwned(ownerId, logEntryId, isExpense = false, resource = LOG_ENTRY).entry
        validate(data)
        return entry.apply { update(data) }
    }

    /** AC8, BR-J4. */
    @Transactional
    fun delete(
        ownerId: UUID,
        logEntryId: UUID,
    ) = expenseDao.delete(rules.findOwned(ownerId, logEntryId, isExpense = false, resource = LOG_ENTRY))

    /**
     * BR-J5: the expense becomes a log entry with the same id; date, odometer and note come from [data], the cost is
     * deleted. Not an addition, so the journal entry limit does not apply (BR-L4).
     */
    @Transactional
    fun convertExpense(
        ownerId: UUID,
        expenseId: UUID,
        data: LogEntryData,
    ): JournalEntryEntity {
        val found = rules.findOwned(ownerId, expenseId, isExpense = true, resource = EXPENSE)
        validate(data)
        expenseDao.deleteCost(checkNotNull(found.cost))
        return found.entry.apply { update(data) }
    }

    /** BR-J2 on top of the shared date and odometer bounds. */
    private fun validate(data: LogEntryData) =
        rules.validate(
            data.date,
            data.odometer,
            extra =
                listOfNotNull(
                    FieldViolation("note", "add an odometer reading, a note, or both")
                        .takeIf { data.odometer == null && data.note == null },
                ),
        )

    private fun JournalEntryEntity.update(data: LogEntryData) {
        date = data.date
        odometer = data.odometer
        note = data.note
    }

    private companion object {
        const val EXPENSE = "Expense"
        const val LOG_ENTRY = "Log entry"
    }
}
