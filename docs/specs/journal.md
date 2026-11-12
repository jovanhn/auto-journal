# Spec: Journal (expenses and log entries)

## Status

Implemented — release **v8 (journal)**

## Goal

Let a user note things about a vehicle that cost nothing (an odometer reading, a condition, a state, an
observation) in the same place as expenses. The vehicle's list of expenses becomes its **journal**: one
timeline of expenses and **log entries**. Odometer readings from log entries also count, so distance driven,
distance per year and cost per km are known more often. Totals and insights still come from expenses only.

Depends on: specs/expenses.md, specs/insights.md, specs/planned-expenses.md, specs/assistant-mcp.md,
specs/data-limits.md, specs/approximate-expenses.md (all Implemented). Data model: ADR 0020.

## User stories

- As a user, I want to log the odometer reading without an expense, so that distance and cost per km stay
  accurate between fill-ups and services.
- As a user, I want to note a condition or observation ("brake noise when cold", "oil level low"), so that I
  have the car's history in one place.
- As a user, I want expenses and log entries in one timeline, so that I see everything that happened to the
  car in order.
- As a user, I want to choose Expense or Log in one form, so that adding either is quick.
- As a user, I want to add a cost to a log entry later (or remove a cost logged by mistake), so that I don't
  have to delete and re-enter it.

## Business rules

New rules and changed rules are in [docs/domain/business-rules.md](../domain/business-rules.md) (marked
**Planned**, v8).

- BR-J1 (new): a vehicle's journal is its expenses and log entries, newest date first.
- BR-J2 (new): a log entry has a date, an optional odometer and an optional note, and at least one of the
  two.
- BR-J3 (new): log entries never count in totals or insights; only their odometer reading is used
  (BR-V5, BR-I7).
- BR-J4 (new): a log entry can be edited and deleted.
- BR-J5 (new): a log entry can be turned into an expense and an expense into a log entry; the entry keeps
  its id and place in the journal.
- BR-V5 (changed): current odometer = the highest of the odometer at start and all journal entry readings
  (expenses and log entries).
- BR-I7 (changed): distance in a year uses all journal entry readings.
- BR-L2 (changed): the per-vehicle limit counts journal entries (expenses + log entries).
- BR-L5, BR-L7 (changed): log entry odometer and date follow the same limits as an expense's.
- BR-U2, BR-A1, BR-A2 apply to log entries like to expenses.

## Acceptance criteria

1. **Add a log entry with an odometer reading**
   - Given my vehicle "Golf" with odometer at start 180,000 and an expense at 184,320 km
   - When I add a log entry dated today with odometer 185,000 and no note
   - Then it is created (201), it appears in the journal as "Odometer reading · <today> · 185,000 km" with no
     amount, and the Golf's current odometer is 185,000
2. **Add a log entry with a note only**
   - When I add a log entry with the note "Brake noise when cold" and no odometer
   - Then it is created and appears in the journal with that note; the current odometer is unchanged
3. **A log entry needs something to say**
   - When I add a log entry with neither odometer nor note (blank note counts as none)
   - Then it is rejected (400) with a field error on `note`, and nothing is saved
4. **Same validation as expenses**
   - When a log entry's date is in the future or before *earliest date*, or its odometer is negative or above
     *max odometer*, or its note is longer than 500 characters
   - Then it is rejected (400) with the matching field error (BR-E2, BR-L5, BR-L7)
5. **One timeline**
   - Given in 2026 an expense on Oct 18, a log entry on Oct 20 and a log entry on Oct 18 created after the
     expense
   - When I open the Golf's journal for 2026
   - Then the October group lists Oct 20 (log), Oct 18 (log), Oct 18 (expense): newest date first, and for
     the same date newest created first
6. **Logs don't change totals**
   - Given October 2026 has a €100.00 expense and two log entries
   - Then the October header, the This year / This month tiles, the Garage summary and Insights show the same
     amounts as without the log entries
7. **Logs improve distance**
   - Given odometer at start 180,000, no expense with an odometer in 2026, and a log entry on 2026-06-01 at
     186,000 km
   - Then Insights for 2026 shows distance 6,000 km and a cost per km for the year (BR-I7, BR-I8), and the
     lifetime cost per km uses distance driven 6,000 km (BR-I4)
8. **Edit and delete a log entry**
   - Given a log entry at 185,000 km that holds the current odometer
   - When I change its odometer to 184,500, the current odometer follows; when I delete it (after
     confirming), it disappears from the journal and the current odometer falls back to the highest
     remaining reading
9. **Expenses keep working**
   - Given expenses created before this release
   - Then they keep their id, date, amount, currency, rate snapshot, category, odometer, note and approximate
     flag, and every expense operation (list, create, edit, delete, mark as paid, MCP tools) behaves as
     before
10. **Deleting an expense deletes its journal entry**
    - When I delete an expense
    - Then neither the expense nor its journal entry remains, and the current odometer follows
11. **Ownership**
    - When I read, change or delete another user's log entry, or add one to another user's vehicle
    - Then the response is 404 (BR-U2)
12. **Expense ids are not log entries**
    - When I call `PUT` or `DELETE /api/log-entries/{id}` with the id of an expense
    - Then the response is 404 and the expense is unchanged
13. **Limit counts both**
    - Given *journal entries per vehicle* = 2 and a vehicle with one expense and one log entry
    - When I add another expense, log entry or mark a planned expense as paid
    - Then it is rejected (409) as in BR-L2, and the planned expense is unchanged
14. **Deleting a vehicle**
    - When I delete a vehicle
    - Then its journal entries (expenses and log entries) are deleted too
15. **Assistant**
    - When Claude calls `create_log_entry`, `update_log_entry`, `delete_log_entry`,
      `convert_log_entry_to_expense`, `convert_expense_to_log_entry` or `list_expenses`
    - Then the result is the same as through the API (BR-A1); `delete_log_entry` and
      `convert_expense_to_log_entry` (it removes the cost) are marked destructive (BR-A4)
16. **Log entry → expense**
    - Given a log entry dated 2026-10-20 at 185,000 km with the note "New wipers"
    - When I open it, switch to Expense, enter 25.00 EUR, category Other, and save
    - Then it is an expense (same id) with those values, date, odometer and note; it has a rate snapshot;
      it stays in its place in the journal and now counts in the totals
17. **Expense → log entry**
    - Given an expense of €40.00 at 185,200 km
    - When I open it, switch to Log and save, and confirm "Remove the cost from this entry?"
    - Then it is a log entry (same id) with the date, odometer and note; its cost no longer counts in any
      total; cancelling the confirmation changes nothing
18. **Conversion rules**
    - When I turn an expense with neither odometer nor note into a log entry without adding one
    - Then it is rejected (400, field `note`) and stays an expense
    - When I turn a log entry into an expense with invalid expense fields (e.g. no category)
    - Then it is rejected (400) with field errors and stays a log entry
    - When the vehicle is at the journal entry limit, converting in either direction still works (BR-L4)
    - When the id is of the wrong kind (an expense for log → expense, a log entry for expense → log) or
      another user's, the response is 404

## Edge cases

- `PUT /api/log-entries/{id}` replaces all fields (like expenses): omitting `odometer` or `note` clears it,
  and BR-J2 is checked on the result.
- A log entry may be dated before the purchase date and may have an odometer lower than the current one
  (as BR-E2, BR-E4); it never lowers the current odometer.
- A month that has only log entries is shown in the journal; its header shows no total (there is nothing to
  sum). The month tile and Insights show 0 for it as today.
- `firstYear` (journal year switcher) is the year of the earliest journal entry (expense or log), or the
  current year if there is none. Insights periods are unchanged (they start from expenses and purchase).
- The note is trimmed; a note that is blank after trimming counts as no note (BR-J2).

## API impact

Additive, not breaking. Existing schemas, paths and expense ids are unchanged.

- **New schemas**
  - `LogEntryRequest { date (required), odometer?, note? }`: same field rules as `ExpenseRequest`
    (date: not in the future, ≥ *earliest date*; odometer: 0 … *max odometer*, nullable; note: ≤ 500,
    nullable). "At least one of odometer and note" is checked by the server (400, field `note`).
  - `LogEntry { id, vehicleId, date, odometer (nullable), note (nullable), createdAt }`, all required.
- **New operations** (tag `expenses`)
  - `POST /api/vehicles/{vehicleId}/log-entries` → `createLogEntry` → 201 `LogEntry`; 400, 401, 404, 409
    (limit, BR-L2).
  - `GET /api/log-entries/{logEntryId}` → `getLogEntry` → 200 `LogEntry`; 400, 401, 404 (an expense's id is
    404). Used by Edit log; added during implementation (owner's decision, 2026-11-10). No MCP tool, like
    `getExpense` (`list_expenses` returns log entries).
  - `PUT /api/log-entries/{logEntryId}` → `updateLogEntry` → 200 `LogEntry`; 400, 401, 404.
  - `DELETE /api/log-entries/{logEntryId}` → `deleteLogEntry` → 204; 401, 404.
  - `POST /api/log-entries/{logEntryId}/expense` → `convertLogEntryToExpense`, body `ExpenseRequest`
    (replaces date, odometer and note too, like an edit) → 200 `Expense` with the same id; 400, 401, 404.
  - `POST /api/expenses/{expenseId}/log-entry` → `convertExpenseToLogEntry`, body `LogEntryRequest` → 200
    `LogEntry` with the same id; 400, 401, 404. The cost (amount, currency, rate snapshot, category,
    approximate) is deleted.
- **Changed (additive)**
  - `ExpenseYear.logEntries`: new required array of `LogEntry` for the year, newest date first, same date
    newest created first. `ExpenseYear.firstYear` now also counts log entries. `listExpenses` stays the one
    call for the journal screen; the frontend merges `expenses` and `logEntries` into one timeline.
  - `createExpense` / `payPlannedExpense` 409 description: the limit counts journal entries.
- **MCP:** new tools `create_log_entry`, `update_log_entry`, `delete_log_entry` (destructive),
  `convert_log_entry_to_expense`, `convert_expense_to_log_entry` (destructive), one per new operation
  (BR-A2). `list_expenses` returns `logEntries` through `ExpenseYear`. The server instructions and
  tool descriptions tell the assistant to use a log entry for an odometer reading or an observation without
  a cost, and an expense when something was paid.
- **Migration** `V7__create_journal_entry.sql` (ADR 0020), one transaction:
  1. create `journal_entry (id uuid PK, vehicle_id uuid NOT NULL FK → vehicle ON DELETE CASCADE, date date
     NOT NULL, odometer integer NULL CHECK ≥ 0, note varchar(500) NULL, created_at timestamptz NOT NULL)`,
     index on `(vehicle_id, date)`;
  2. copy `id, vehicle_id, date, odometer, note, created_at` of every expense into `journal_entry`, same ids;
  3. add FK `expense.id → journal_entry.id ON DELETE CASCADE`;
  4. drop `vehicle_id`, `date`, `odometer`, `note`, `created_at` from `expense`.
  Production holds only the owner's data, so no extra migration tests beyond the normal integration tests.
- **Config:** `autojournal.limits.expenses-per-vehicle` becomes `journal-entries-per-vehicle` (env
  `LIMIT_JOURNAL_ENTRIES_PER_VEHICLE`, default 3,000). Update `.env.example` and `docs/operations.md`; if
  `LIMIT_EXPENSES_PER_VEHICLE` is set on Render, the owner renames it before the merge.
- **Backend:** both tables are owned by the `expenses` module (no rename). `vehicles` reads odometer
  readings from `journal_entry` (read-only DAO) instead of `expense`. Expense queries by vehicle and date
  join `journal_entry`.

## UI notes

- **Vehicle tab "Expenses" → "Journal"** (screen 02): same layout, tiles, period switcher and month groups.
  Tiles and month totals are unchanged (expenses only).
- **Rows:** expense rows as today. A **log row** has a neutral icon instead of the category dot, the note as
  its title (or "Odometer reading" when there is no note), the date line "Oct 20 · 185,000 km" (or the date
  only), and no amount. Its accessible text starts with "Log".
- **FAB "Add"** opens one form, titled "Add to journal", with a segmented control **Expense | Log** at the
  top (default Expense).
  - Expense: the expense form as today.
  - Log: date (default today), odometer (optional), note (optional), with the hint "Add an odometer reading,
    a note, or both". Save is allowed; the server's BR-J2 error is also checked in the form (zod).
- **Edit:** tapping a row opens the same form, titled "Edit expense" or "Edit log", pre-filled, with the
  **Expense | Log** control set to the entry's type and a Delete button that asks for confirmation.
  - Switching Log → Expense shows the cost fields (currency defaults to the display currency); Save
    converts (`convertLogEntryToExpense`).
  - Switching Expense → Log hides the cost fields; Save asks "Remove the cost from this entry?" and then
    converts (`convertExpenseToLogEntry`).
  - Date, odometer and note are kept when switching.
- **Mark as paid** is unchanged (always an expense).
- States: loading skeletons as today; empty year text "No journal entries in 2026"; error with retry;
  submitting; server field errors mapped onto fields.
- `docs/design/design.md`: Journal tab name, log row and the Expense | Log control as components, changelog
  entry. The design export is not changed.

## E2E

- `add-edit-delete-log-entry` — add a log entry with an odometer reading, see it in the journal and the
  current odometer in the app bar update; edit its note; delete it with confirmation.
- `convert-log-entry` — turn a log entry into an expense and see the "This year" tile include it; turn it
  back into a log entry (confirming) and see the tile drop it.
- Existing flows (`add-edit-delete-expense`, `plan-and-pay-expense`) only get locator updates for the
  "Journal" tab and the "Add" FAB; their assertions stay.

## Out of scope

- Converting from the journal list (swipe / row action); conversion is only in the edit form.
- Converting several entries at once.
- Structured readings (tire pressure, oil level, battery, fuel consumption), log categories or tags.
- Log entries as issues (open / resolved), reminders or notifications.
- A filter in the journal (All · Expenses · Logs).
- Renaming the `expenses` module, the `/api/expenses` paths or the `Expense` schemas.
