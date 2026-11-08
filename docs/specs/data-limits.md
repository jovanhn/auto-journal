# Spec: Data limits

## Status

Implemented — release **v5 (limits)**.

## Goal

Stop a single account from filling the database (by a script or a bug) by capping how many vehicles,
expenses and planned expenses it can create and by bounding numeric and date fields, while staying far
above what a real user needs.

## User stories

- As the owner of autojournal, I want each account's data to be bounded, so that one account cannot fill
  the database or slow the app down for everyone.
- As the owner, I want to change every limit through configuration, so that I can raise or lower it
  without a code change.
- As a user, I want a clear message when I reach a limit, so that I know why I cannot add more.

## Business rules

- BR-L1: at most *vehicles per user* vehicles (default 10).
- BR-L2: at most *expenses per vehicle* expenses (default 3,000), also through mark as paid.
- BR-L3: at most *planned expenses per vehicle* planned expenses (default 50).
- BR-L4: limits only block creating; existing data is never removed or hidden.
- BR-L5: odometer readings are between 0 and *max odometer* km (default 2,000,000).
- BR-L6: recurrence is every 1 to *max recurrence months* months (default 120).
- BR-L7: purchase and expense dates are on or after *earliest date* (default 1900-01-01); a planned due date
  is at most *planned years ahead* years ahead (default 10).
- BR-A1: assistant (MCP) tools get the same limits as the API.

### Configuration

| Property                                          | Env var                              | Default    |
| ------------------------------------------------- | ------------------------------------ | ---------- |
| `autojournal.limits.vehicles-per-user`            | `LIMIT_VEHICLES_PER_USER`            | 10         |
| `autojournal.limits.expenses-per-vehicle`         | `LIMIT_EXPENSES_PER_VEHICLE`         | 3000       |
| `autojournal.limits.planned-expenses-per-vehicle` | `LIMIT_PLANNED_EXPENSES_PER_VEHICLE` | 50         |
| `autojournal.limits.max-odometer-km`              | `LIMIT_MAX_ODOMETER_KM`              | 2000000    |
| `autojournal.limits.max-recurrence-months`        | `LIMIT_MAX_RECURRENCE_MONTHS`        | 120        |
| `autojournal.limits.earliest-date`                | `LIMIT_EARLIEST_DATE`                | 1900-01-01 |
| `autojournal.limits.planned-years-ahead`          | `LIMIT_PLANNED_YEARS_AHEAD`          | 10         |

Defaults live in `application.yml` for every profile (like the exchange rates), so production needs no new
env var to deploy; setting one on Render overrides the default. Numbers must be ≥ 1 and the earliest date a
valid ISO date not in the future, otherwise the backend fails to start.

Because every bound is configurable, none of them is fixed in the contract (`maximum`) or in DB checks: the
backend services check them against the configuration.

## Acceptance criteria

1. **Vehicle limit reached**
   - Given a user who has as many vehicles as *vehicles per user*
   - When they add another vehicle
   - Then the request is rejected with 409, no vehicle is created, and the message says the user can have at
     most that many vehicles

2. **Vehicle limit is per user**
   - Given user A at the vehicle limit
   - When user B (below the limit) adds a vehicle
   - Then it is created

3. **Expense limit reached**
   - Given a vehicle with as many expenses as *expenses per vehicle*
   - When the user adds another expense to it
   - Then the request is rejected with 409, no expense is created, and the message names the limit

4. **Expense limit is per vehicle**
   - Given vehicle X at the expense limit and the same user's vehicle Y below it
   - When the user adds an expense to Y
   - Then it is created

5. **Mark as paid at the expense limit**
   - Given a vehicle at the expense limit with a planned expense
   - When the user marks the planned expense as paid
   - Then the request is rejected with 409, no expense is created, and the planned expense is unchanged
     (still listed, same due date)

6. **Planned expense limit reached**
   - Given a vehicle with as many planned expenses as *planned expenses per vehicle*
   - When the user adds another planned expense to it
   - Then the request is rejected with 409 and no planned expense is created

7. **Data above a limit stays usable**
   - Given a user with more vehicles (or a vehicle with more expenses / planned expenses) than the current
     limit, e.g. because the limit was lowered
   - When they list, view, edit or delete those records
   - Then it works as before; only adding a new one is rejected until the count is below the limit

8. **Editing at the limit**
   - Given a user at a limit
   - When they edit an existing record
   - Then the edit succeeds

9. **Limits are configurable**
   - Given any `autojournal.limits.*` property set to a value other than its default
   - When the backend starts
   - Then that value is enforced instead of the default (counts and value bounds alike); an invalid value
     (number below 1, unparsable or future earliest date) stops the backend from starting

10. **Odometer upper bound**
    - Given a vehicle or expense (create or edit)
    - When the odometer is above *max odometer*
    - Then the request is rejected with 400 with the odometer field, and the form shows the message on that
      field

11. **Recurrence upper bound**
    - When a planned expense is saved with recurrence above *max recurrence months*
    - Then the request is rejected with 400 with field `recurrenceMonths`, shown on that field

12. **Date bounds**
    - When a vehicle purchase date or an expense date is before *earliest date*, or a planned due date is more
      than *planned years ahead* years after today (UTC)
    - Then the request is rejected with 400 with that date field, shown on that field

13. **Value bounds apply to edits too, not to stored data**
    - Given a stored record whose value is outside a bound (e.g. after a bound was lowered)
    - When it is listed or viewed
    - Then it is shown as stored; saving an edit must bring the value within the bound

14. **Assistant gets the same limits**
    - Given a user at a limit
    - When an assistant calls the matching create tool (or the pay tool)
    - Then it gets the same rejection as the API

## Edge cases

- Two creates at once when one slot is left may both succeed (count checked in the service, no lock). One
  extra record is acceptable; the limit is protection, not billing.
- Deleting a record frees a slot immediately.
- Deleting a vehicle deletes its expenses and planned expenses (BR-V6), freeing all their slots.
- Production data may already be outside a value bound (BR-L5…L7). Nothing breaks (no DB checks; AC 13),
  but check with a read-only query before release and report any such rows.
- Recurring plans whose next due date (after mark as paid, BR-PL3) lands beyond *planned years ahead* are
  allowed: the bound applies only to the due date the user enters.

## API impact

- `POST /api/vehicles`, `POST /api/vehicles/{vehicleId}/expenses`,
  `POST /api/vehicles/{vehicleId}/planned-expenses`, `POST /api/planned-expenses/{id}/pay`: add the `409`
  `Conflict` response where missing; describe the limit in the operation description. The `ProblemDetail`
  `detail` carries the user-facing message (with the limit number).
- `odometerAtStart`, `ExpenseRequest.odometer`, `PlannedExpenseRequest.recurrenceMonths`, purchase date,
  expense date, due date: descriptions say the server checks the configured bound (no `maximum` in the
  schema, since the value is configurable); the operations already declare `400`.
- **Breaking (tightened validation, contracts/AGENTS.md):** the new bounds reject values that were accepted
  before. Approved by the owner on 2026-11-08; the implementing commit uses `feat(contracts)!:` with a
  `BREAKING CHANGE:` footer.
- No migration: no new tables, columns or DB checks.

## UI notes

- The frontend does not know the limits, so zod schemas do not check them: a 400 for a bound is shown on
  its field through the existing server field-error mapping in the forms.
- On 409 from a create, the form shows the server message (form-level error) and stays open; nothing
  changes in the lists.
- Add buttons are not disabled ahead of time.

## E2E

- none (rejections are covered by backend integration tests and frontend component tests)

## Out of scope

- Daily / monthly write limits and rate limiting (later).
- Exposing the limits or remaining counts to the frontend.
- Per-user overrides of limits.
- Limits on the number of accounts (Supabase Auth sign-up settings).
