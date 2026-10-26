# Spec: Expenses

## Status

Planned — release **v1 (MVP)**, after specs/auth.md and specs/vehicles.md

## Goal

Let a user log what each car really costs — add, view, edit and delete expenses — and see this year's and
this month's totals per car and across all cars. This is the core of the app; insights (v2) and planned
expenses (v3) build on it.

Depends on: specs/auth.md, specs/vehicles.md.

## User stories

- As a user, I want to add an expense to a car quickly, so that logging costs is not a chore.
- As a user, I want to see a car's expenses for a year grouped by month, so that I can review what I spent.
- As a user, I want to see this year's and this month's total for a car, so that I know where I stand.
- As a user, I want to see this year's total across all my cars on the Garage, so that I see the whole
  picture.
- As a user, I want to correct or delete an expense, so that mistakes don't distort my numbers.

## Business rules

- BR-U2: Only the owner of the vehicle sees or changes its expenses; otherwise 404.
- BR-C1, BR-C2, BR-C4, BR-C6: an expense amount is Money (EUR/RSD/USD, 2 decimals, ≥ 0), defaults to the
  display currency, stores a rate snapshot when saved; totals are shown in the display currency.
- BR-E1: Date, amount, currency and category are required; odometer (≥ 0) and note (≤ 500 chars) are
  optional.
- BR-E2: Expense date is not in the future; it may be before the vehicle's purchase date.
- BR-E3: Category is one of the fixed list.
- BR-E4: An expense odometer may be lower than the current odometer; it never lowers it.
- BR-E5: An expense can be edited and deleted; the current odometer follows (BR-V5).
- BR-V5: Current odometer = max(odometer at start, expense odometer readings).
- BR-V6: Deleting a vehicle deletes its expenses.
- BR-I1: Yearly and monthly totals = sum of the expenses dated in that year / month.
- BR-I6: All-cars summary: this year's total across vehicles; average per month = that total ÷ months
  elapsed this year, including the current month.

## Acceptance criteria

1. **Add an expense**
   - Given my vehicle "Golf" and display currency EUR
   - When I add an expense: 52.40 EUR, Fuel, 2026-10-18, odometer 184320, no note
   - Then it is created (201) for "Golf", appears under October in the 2026 list, and the "This year" and
     "This month" tiles and the October header include 52.40
2. **Required fields and limits**
   - When I submit without date, amount, currency or category, or with a future date, a negative amount or
     odometer, more than 2 decimals, an unknown category or currency, or a note over 500 characters
   - Then the response is 400 with a field error per invalid field; nothing is saved
3. **Year list grouped by month**
   - Given expenses in September and October 2026 and one in 2025
   - When I open the Expenses tab (current year 2026)
   - Then I see 2026's expenses grouped by month, newest month first; inside a month newest date first and,
     for the same date, newest created first; each month header shows its total; the 2025 expense is not shown
4. **Year switcher**
   - Given my earliest expense is dated 2024
   - When I use the year switcher
   - Then I can go from 2024 to the current year, not before 2024 and not into the future; with no expenses at
     all only the current year is available
5. **Empty year**
   - Given no expenses in the selected year
   - Then I see an empty state inviting me to add an expense, and both tiles show 0
6. **Mixed currencies**
   - Given display currency EUR and expenses of 10.00 EUR and 1,170.00 RSD (snapshot 117.00 RSD per EUR)
   - When I open the list
   - Then the RSD expense shows €10.00 with its original 1,170.00 RSD, and the year total is €20.00
7. **Edit an expense**
   - Given an expense
   - When I tap it, change amount and note and save
   - Then the change is shown and totals follow; changing amount or currency takes a new rate snapshot,
     editing other fields keeps it (BR-C4)
8. **Delete an expense**
   - Given an expense
   - When I delete it from the edit form and confirm
   - Then it is gone, totals and the current odometer follow; cancelling deletes nothing
9. **Current odometer follows expenses**
   - Given "Golf" with odometer at start 180000
   - When I add expenses with odometer 184320 and then a back-dated one with 182000
   - Then the current odometer is 184320; after deleting the 184320 expense it is 182000
10. **Garage summary**
    - Given two vehicles with 2026 expenses of €1,000 and €200 and it is October 2026
    - When I open the Garage
    - Then the hero shows this year €1,200, 2 vehicles and average €120 / month, and each card shows its own
      "this year" total (€0 for a vehicle without expenses this year)
11. **Another user's data**
    - Given a vehicle or expense owned by another user
    - When I list, add, get, edit or delete through it
    - Then the response is 404 and nothing changes
12. **Vehicle deleted**
    - Given a vehicle with expenses
    - When the vehicle is deleted
    - Then its expenses are deleted too and no longer count in the Garage summary

## Edge cases

- Note is trimmed; a blank note is stored as null.
- An amount of 0 is valid (e.g. a free service).
- "Not in the future" and "current year / month" use the server's current date (UTC).
- `year` query parameter outside 1900 … current year → 400.
- Sums use full precision; only the returned Money values are rounded half-up to 2 decimals (so a month
  header can differ by a cent from the sum of its rounded rows; accepted).
- Expenses dated before the vehicle was added count normally in every total.
- Vehicle deletion removes expenses through the foreign key `expense.vehicle_id → vehicle.id ON DELETE
  CASCADE` (no module event).

## API impact

New tag/module `expenses` (depends on `vehicles::api` for ownership checks, `users::api` for the display
currency). All operations require auth and declare 401.

- `GET /api/vehicles/{vehicleId}/expenses?year=` → `ExpenseYear` (`listExpenses`); `year` defaults to the
  current year; 400, 404.
- `POST /api/vehicles/{vehicleId}/expenses` with `ExpenseRequest` → 201 `Expense` (`createExpense`); 400, 404.
- `GET /api/expenses/{expenseId}` → `Expense` (`getExpense`); 404.
- `PUT /api/expenses/{expenseId}` with `ExpenseRequest` → `Expense` (`updateExpense`); 400, 404.
- `DELETE /api/expenses/{expenseId}` → 204 (`deleteExpense`); 404.
- `GET /api/expenses/summary` → `ExpenseSummary` (`getExpenseSummary`), current year only.

Schemas:

- `Category` enum: `FUEL`, `SERVICE`, `REPAIRS`, `INSURANCE`, `REGISTRATION_TAX`, `TIRES`, `PARKING_TOLLS`,
  `OTHER`. Shared with planned expenses.
- `ExpenseRequest { date, amount: Money, category, odometer?, note? }`.
- `Expense { id, vehicleId, date, amount: Money (original), displayAmount: Money, category, odometer
  (nullable), note (nullable), createdAt }`.
- `ExpenseYear { year, firstYear, yearTotal: Money, monthTotals: Money[12] (Jan…Dec), expenses: Expense[] }`
  — `firstYear` is the year of the earliest expense, or the current year if none (drives the switcher).
- `ExpenseSummary { year, total: Money, averagePerMonth: Money, vehicles: [{ vehicleId, total: Money }] }` —
  vehicles without expenses this year may be omitted; the UI shows €0.

`Vehicle.currentOdometer` (specs/vehicles.md) now also reflects expense readings (BR-V5), read with a
`JdbcClient` cross-module read in `vehicles`.

## UI notes

- **Vehicle page = Expenses tab** (screen 02): app bar (back → Garage, nickname, "make model · year ·
  current odometer"), with an Edit vehicle action (opens the vehicle form with Delete, specs/vehicles.md).
  Until v2/v3 the bottom tab bar shows only the tabs that exist (Expenses); Insights and Planned appear with
  their specs.
- Tiles: **This year**, **This month** (current month, only meaningful for the current year; for a past year
  show that year's total and hide "This month"). Per km comes with specs/insights.md.
- Period switcher: "2026" with prev/next buttons, disabled at the range ends; no category filter.
- Month groups: header "October" + month total; rows: category dot, "Category · note", "Oct 18 · 184,320 km"
  (or the note's date line without odometer), display amount right; original amount as secondary text when
  its currency differs from the display currency.
- **Add expense** (screen 05) from the FAB: amount with currency select (default display currency),
  category picker, date (default today), odometer (optional), note (optional). **No vehicle picker** — the
  vehicle is the one the FAB was on. Save returns to the list.
- **Edit expense:** tapping a row opens the same form titled "Edit expense", pre-filled, with a Delete button
  at the bottom that asks for confirmation.
- **Garage** (screen 01): all-cars hero (this year total, vehicle count from the vehicles list, average per
  month) and each card's "this year" amount from `ExpenseSummary`.
- States: loading skeletons (tiles, list, hero), empty year, error with retry, submitting forms, server
  field errors (400) mapped onto fields.

## E2E

- Add an expense and see it in the list and in the "This year" tile; edit it; delete it with confirmation.

## Out of scope

- Category filter, search, sorting options, pagination, other periods than calendar year.
- Receipt photos, attachments, fuel volume / consumption, recurring expenses (see specs/planned-expenses.md).
- Moving an expense to another vehicle; bulk import or export.
