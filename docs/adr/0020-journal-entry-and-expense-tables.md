# 0020. Journal: `journal_entry` + `expense` tables (class-table inheritance)

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Users want to record things about a vehicle that cost nothing (odometer readings, conditions, observations)
in the same timeline as expenses (specs/journal.md). Expenses and these *log entries* share date, odometer
and note; only expenses have amount, currency, rate snapshot, category and the approximate flag. The current
odometer (BR-V5) and distance per year (BR-I7) must use readings from both. Totals and insights must use
expenses only. Production holds only the owner's data, so a data migration carries little risk.

## Decision

- Every journal entry has a row in `journal_entry` (`id`, `vehicle_id`, `date`, `odometer`, `note`,
  `created_at`).
- An expense additionally has a row in `expense` with the **same id** (PK and FK → `journal_entry.id`
  `ON DELETE CASCADE`) holding `amount`, `currency`, `rate_to_eur`, `category`, `approximate`, all NOT NULL.
- A log entry is a `journal_entry` row with no `expense` row.
- Migration V7 creates `journal_entry`, copies the shared columns of every existing expense (same ids), adds
  the FK and drops the moved columns from `expense`.
- Both tables are owned by the `expenses` module (they are joined by JPA/SQL inside one module). The module
  is not renamed. Other modules read odometer readings from `journal_entry` through read-only DAOs.
- Money queries (totals, insights, summary) start from `expense` and join `journal_entry` for vehicle and
  date; odometer queries read `journal_entry` only.
- The API is additive: expense endpoints and schemas are unchanged; log entries get their own endpoints.

## Consequences

- One source for odometer readings and one table for the journal timeline; no unions.
- Expense fields stay strictly NOT NULL; log entries never appear in money queries by construction.
- Every expense read by vehicle or date now joins `journal_entry`; the expense JPA mapping spans two tables.
- Deleting an expense must delete its `journal_entry` row (the `expense` row follows by cascade).
- Converting is cheap and keeps the id: log entry → expense inserts an `expense` row; expense → log entry
  deletes it (BR-J5).

## Alternatives considered

- **Rename `expense` to a generic record with nullable money columns** — every money query would need a
  `kind` filter, half the columns are empty for logs, and the contract would break.
- **One `journal_entry` table with a `kind` column and nullable cost columns** — same nullable-money and
  filtering problems, plus CHECK constraints per kind.
- **Separate `log_entry` table next to an unchanged `expense`** — no migration, but the journal list and
  the odometer would need unions of two tables, and date/odometer/note would be duplicated in two places.
