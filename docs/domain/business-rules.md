# Business rules

Each rule has an ID referenced by specs and tests. "Enforced" says where the rule is implemented today;
**Planned** rules are agreed but not built yet.

## Users and access

| ID    | Rule                                                                                         | Enforced    |
| ----- | -------------------------------------------------------------------------------------------- | ----------- |
| BR-U1 | Every API request requires a signed-in user (Supabase Auth, email + password).                | **Planned** |
| BR-U2 | A user sees and changes only their own vehicles and everything under them. Another user's data responds as not found (404). | **Planned** |
| BR-U3 | A user profile is created on the user's first authenticated request, with display currency `EUR`. | **Planned** |
| BR-U4 | A user can change their display currency to any supported currency.                           | **Planned** |

## Money and currency

| ID    | Rule                                                                                         | Enforced    |
| ----- | -------------------------------------------------------------------------------------------- | ----------- |
| BR-C1 | Supported currencies are `EUR`, `RSD`, `USD`. Amounts have 2 decimals and are ≥ 0.            | **Planned** |
| BR-C2 | Every amount carries its own currency; new amounts default to the user's display currency.    | **Planned** |
| BR-C3 | Exchange rates are fixed values in application configuration (ADR 0014); users cannot edit them. | **Planned** |
| BR-C4 | An expense and a vehicle's purchase price store a rate snapshot when saved; conversions of them always use that snapshot. Editing the amount or currency takes a new snapshot. | **Planned** |
| BR-C5 | Planned expenses (estimates) are converted with the current configured rates.                 | **Planned** |
| BR-C6 | Totals, sums and derived figures are shown in the user's display currency.                    | **Planned** |

## Vehicles

| ID    | Rule                                                                                         | Enforced    |
| ----- | -------------------------------------------------------------------------------------------- | ----------- |
| BR-V1 | Nickname, make, model, year, odometer at start, purchase price and purchase date are required; plate is optional. | **Planned** |
| BR-V2 | Year is between 1900 and next calendar year.                                                  | **Planned** |
| BR-V3 | Purchase date is not in the future; odometer at start (the reading when the vehicle is added) is ≥ 0. | **Planned** |
| BR-V4 | Nickname is unique among one user's vehicles, case-insensitive. Plate is not unique.          | **Planned** |
| BR-V5 | Current odometer = the highest of the odometer at start and all of the vehicle's expense odometer readings. It is never entered directly. | **Planned** |
| BR-V6 | A vehicle can be edited and deleted. Deleting (after confirmation in the UI) also deletes its expenses and planned expenses. | **Planned** |
| BR-V7 | Car value equals the purchase price (for now).                                                | **Planned** |
| BR-V8 | A user's vehicles are listed in the order they were added (oldest first).                     | **Planned** |

## Expenses

| ID    | Rule                                                                                         | Enforced    |
| ----- | -------------------------------------------------------------------------------------------- | ----------- |
| BR-E1 | Date, amount, currency and category are required; odometer (≥ 0) and note (≤ 500 chars) are optional. | **Planned** |
| BR-E2 | Expense date is not in the future; it may be before the vehicle's purchase date.             | **Planned** |
| BR-E3 | Category is one of the fixed list: Fuel, Service, Repairs, Insurance, Registration & tax, Tires, Parking & tolls, Other. | **Planned** |
| BR-E4 | An expense odometer may be lower than the current odometer (back-dated entries); it never lowers the current odometer. | **Planned** |
| BR-E5 | An expense can be edited and deleted; the current odometer follows (BR-V5).                   | **Planned** |

## Planned expenses

| ID     | Rule                                                                                        | Enforced    |
| ------ | ------------------------------------------------------------------------------------------- | ----------- |
| BR-PL1 | Category, estimated amount, currency and due date are required; recurrence is one-time or every N months (N ≥ 1); note (≤ 500 chars) is optional. There is no title. | **Planned** |
| BR-PL2 | Mark as paid creates an expense pre-filled with the planned amount, currency, category, due date and note; the user can change amount, currency, date, odometer and note before saving. The expense follows BR-E1…E4. | **Planned** |
| BR-PL3 | After mark as paid, a one-time planned expense is removed; a recurring one moves its due date forward by N months. | **Planned** |
| BR-PL4 | A planned expense can be edited and deleted without being paid.                             | **Planned** |
| BR-PL5 | A planned expense whose due date has passed stays listed (overdue) until paid or deleted.    | **Planned** |

## Insights

All figures are per vehicle, in the display currency (BR-C6), from expenses by their date.

| ID    | Rule                                                                                         | Enforced    |
| ----- | -------------------------------------------------------------------------------------------- | ----------- |
| BR-I1 | Yearly total and monthly totals = sum of the expenses in that year / month.                  | **Planned** |
| BR-I2 | Category breakdown = sum per category for the selected period, with its share of the total.   | **Planned** |
| BR-I3 | Average monthly cost = total expenses ÷ months tracked, counting every calendar month from the month the vehicle was added to the app (`created_at`) through the current month, including months without expenses. | **Planned** |
| BR-I4 | Cost per km = (total expenses + purchase price) ÷ distance driven (current odometer − odometer at start). Not shown when distance driven is 0. | **Planned** |
| BR-I5 | The projection covers the next 12 calendar months, starting with the current one, from planned expenses only: one-time items in their due month, recurring items in every month they fall due (due date + k·N months). Overdue items count in the current month. | **Planned** |
| BR-I6 | All-cars summary (Garage): this year's total = sum of all the user's expenses dated in the current calendar year, across vehicles; average per month = that total ÷ the number of months elapsed this year, including the current month. | **Planned** |

## Interpretation notes (assumptions, confirm before changing)

- Text fields are trimmed before validation and storage; uniqueness compares trimmed values.
- Conversion: `amount × rate_to_eur` gives EUR; EUR → display currency uses the current configured rate.
  So totals in `EUR` never change; totals in `RSD`/`USD` change only when the configured EUR → display rate
  changes (accepted). Results are rounded half-up to 2 decimals only for display; sums use full precision.
- Error mapping: validation → 400, missing (or another user's) resource → 404, business-rule violation → 409,
  all as RFC 9457 `ProblemDetail` with optional field `errors` (see contracts/AGENTS.md).

## Example scaffold (removed when the `vehicles` module exists)

| ID      | Rule                                                                 | Enforced                                                         |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BR-P1   | A project name is required.                                          | Contract (`minLength`, non-blank pattern), bean validation → 400 |
| BR-P2   | Project names are unique, case-insensitive.                          | `ProjectService` → 409 with field error `name`; unique index     |
| BR-T1   | A task title is 1–200 characters.                                    | Contract (`minLength`/`maxLength`), bean validation → 400        |
| BR-T2   | A task belongs to exactly one project, which must exist.             | `TaskService` via `ProjectApi` → 404; FK `task.project_id`       |
| BR-T3   | A new task is `OPEN`.                                                | `TaskEntity` default                                             |
