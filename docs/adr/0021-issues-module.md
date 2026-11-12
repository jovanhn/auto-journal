# 0021. Issues: own module and table, linked to an expense by a nullable FK

- **Status:** Accepted
- **Date:** 2026-11-10

## Context

Users want to track problems with a vehicle (a warning light, a noise, a mechanic's remark) from when they
are noticed until they are fixed or go away, and later see which expense fixed them (specs/issues.md v10,
specs/issue-expenses.md v11). An issue has its own fields (title, severity, source, noticed date, outcome,
resolved date), its own lifecycle (open → resolved → reopened) and its own tab. It costs nothing by itself;
the money is in the expense that fixes it. The journal (ADR 0020) already holds expenses and log entries.

## Decision

- A new Spring Modulith module **`issues`** owns the table **`issue`**. It mirrors `planning`: `api` package
  without public types for now, everything else in `internal`.
- `issue.vehicle_id` → `vehicle.id` `ON DELETE CASCADE`, like `planned_expense` (vehicle deletion uses no
  module event, BR-V6).
- An issue is not a journal entry. Its odometer reading is for information only: the current odometer
  (BR-V5) and distance (BR-I7) keep reading only `journal_entry`.
- Status is derived from the resolution columns: `outcome` and `resolved_on` are both null (open) or both set
  (resolved), enforced by a CHECK.
- **v11:** `issue.expense_id` → `expense.id` `ON DELETE SET NULL`, nullable, not unique (one expense may fix
  several issues). It points at `expense`, not `journal_entry`, so deleting the expense or turning it into a
  log entry (which deletes the `expense` row, BR-J5) clears the link without code in `expenses`.
- `issues` uses `expenses::api` only: `ExpenseApi.create` for "resolve and add expense" (joins the caller's
  transaction, like `PlannedExpenseService.pay`) and a new read method for the linked expenses with display
  amounts. The rate-snapshot conversion stays in `expenses`.
- The dependency goes one way: `issues` → `expenses`. `expenses` never reads `issue` (no "fixes issue" on
  journal rows); a back-link, if ever needed, is joined in the frontend.

## Consequences

- Journal, money and insights queries are unaffected by construction; no conversions between issues and
  journal entries.
- A delete in `expenses` changes a column in `issue` through the database (SET NULL). This is the second kind
  of cross-module FK effect, next to vehicle cascades; it must stay in the ADR and in `entities.md`.
- An issue's odometer reading never updates the current odometer; users who want that log the reading (or
  the fixing expense) in the journal.
- New limit *issues per vehicle* (BR-L8); new MCP tools per operation (BR-A2).

## Alternatives considered

- **Issue as a third kind of journal entry (`journal_entry` + `issue` row, ADR 0020 style)** — the odometer
  would count for free, but issues would appear in the journal and its filters, the entry date would have to
  mean both "noticed" and "resolved", conversions would grow from two to six directions, and issues would
  count toward the journal entry limit.
- **Issue tables inside the `expenses` module** — avoids a new module, but `expenses` already owns the
  journal, insights and summary; issues have their own lifecycle and tab, like planned expenses.
- **No stored link, only a copied cost** — simpler, but the cost would go stale when the expense is edited
  and could not be opened from the issue.
- **Link FK to `journal_entry`** — would survive turning the expense into a log entry and leave the issue
  linked to something with no cost.
