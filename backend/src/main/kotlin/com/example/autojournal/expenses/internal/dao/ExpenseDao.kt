package com.example.autojournal.expenses.internal.dao

import com.example.autojournal.expenses.internal.dto.JournalEntry
import com.example.autojournal.expenses.internal.entity.ExpenseEntity
import com.example.autojournal.expenses.internal.entity.JournalEntryEntity
import com.example.autojournal.expenses.internal.repository.ExpenseRepository
import com.example.autojournal.expenses.internal.repository.JournalEntryRepository
import org.springframework.stereotype.Component
import java.time.LocalDate
import java.util.UUID

/**
 * Write DAO: the module's persistence access for its own `journal_entry` and `expense` tables (wraps JPA,
 * ADR 0020). Reads return each [JournalEntry] with its cost, or none for a log entry.
 */
@Component
class ExpenseDao(
    private val journalEntryRepository: JournalEntryRepository,
    private val expenseRepository: ExpenseRepository,
) {
    /** Inserts the entry and, for an expense, its cost (in that order: the cost references the entry). */
    fun insert(
        entry: JournalEntryEntity,
        cost: ExpenseEntity?,
    ): JournalEntry {
        journalEntryRepository.save(entry)
        cost?.let { expenseRepository.save(it) }
        return JournalEntry(entry, cost)
    }

    fun insertCost(cost: ExpenseEntity): ExpenseEntity = expenseRepository.save(cost)

    fun deleteCost(cost: ExpenseEntity) = expenseRepository.delete(cost)

    fun find(id: UUID): JournalEntry? =
        journalEntryRepository.findById(id).orElse(null)?.let { JournalEntry(it, expenseRepository.findById(id).orElse(null)) }

    fun countByVehicle(vehicleId: UUID): Long = journalEntryRepository.countByVehicleId(vehicleId)

    /** Newest date first; for the same date, newest created first (BR-J1). */
    fun findInPeriod(
        vehicleId: UUID,
        from: LocalDate,
        to: LocalDate,
    ): List<JournalEntry> =
        withCosts(journalEntryRepository.findAllByVehicleIdAndDateBetweenOrderByDateDescCreatedAtDesc(vehicleId, from, to))

    /** All of the vehicle's journal entries, newest date first; for the same date, newest created first (BR-J1). */
    fun findJournal(vehicleId: UUID): List<JournalEntry> =
        withCosts(journalEntryRepository.findAllByVehicleIdOrderByDateDescCreatedAtDesc(vehicleId))

    /** All of the vehicle's journal entries, any order (insights over all years). */
    fun findAllByVehicle(vehicleId: UUID): List<JournalEntry> = withCosts(journalEntryRepository.findAllByVehicleId(vehicleId))

    /** The earliest journal entry date (expense or log entry). */
    fun earliestDate(vehicleId: UUID): LocalDate? = journalEntryRepository.findEarliestDate(vehicleId)

    /** Deletes the entry with its cost. */
    fun delete(entry: JournalEntry) {
        entry.cost?.let { expenseRepository.delete(it) }
        journalEntryRepository.delete(entry.entry)
    }

    private fun withCosts(entries: List<JournalEntryEntity>): List<JournalEntry> {
        if (entries.isEmpty()) return emptyList()
        val costs = expenseRepository.findAllById(entries.map { it.id }).associateBy { it.id }
        return entries.map { JournalEntry(it, costs[it.id]) }
    }
}
