# Spec: Planned expenses

## Status

Implemented — release **v3**

## Goal

Let a user plan a car's upcoming costs (registration, insurance, a timing belt), see what is due soon and
what the next 12 months will cost, and turn a plan into a real expense when it is paid.

Depends on: specs/vehicles.md, specs/expenses.md.

## User stories

- As a user, I want to plan an upcoming expense with a due date and estimate, so that it doesn't surprise me.
- As a user, I want recurring plans (yearly insurance), so that I enter them once.
- As a user, I want to see which plans are due soon, so that I can act in time.
- As a user, I want to mark a plan as paid, so that it becomes a real expense without retyping it.
- As a user, I want to see the expected cost of the next 12 months, so that I can budget.

## Business rules

- BR-U2: Only the vehicle's owner sees or changes its planned expenses; otherwise 404.
- BR-C1, BR-C2, BR-C5: the estimate is Money, defaults to the display currency, and is converted with the
  current configured rates (no snapshot).
- BR-V6: Deleting a vehicle deletes its planned expenses.
- BR-PL1: Category, estimated amount, currency and due date are required; recurrence is one-time or every
  N months (N ≥ 1); note (≤ 500 chars) optional. No title.
- BR-PL2: Mark as paid creates an expense pre-filled from the plan; the user can change amount, currency,
  date, odometer and note; the expense follows BR-E1…E4.
- BR-PL3: After mark as paid, a one-time plan is removed; a recurring one moves its due date forward by N
  months.
- BR-PL4: A plan can be edited and deleted without being paid.
- BR-PL5: An overdue plan stays listed until paid or deleted.
- BR-PL6: A plan is *due soon* when due within the next 30 days or overdue.
- BR-I5: The projection covers the next 12 calendar months from planned expenses only; overdue items count
  in the current month.

## Acceptance criteria

1. **Plan an expense**
   - Given my vehicle "Golf"
   - When I plan Insurance, 320 EUR, due 2027-03-02, every 12 months, note "renewal"
   - Then it is created (201) and listed as "Insurance · renewal", "Mar 2, 2027 · repeats yearly", €320
2. **Required fields and limits**
   - When I submit without category, amount, currency or due date, with a negative amount, more than 2
     decimals, recurrence < 1, or a note over 500 characters
   - Then the response is 400 with a field error per invalid field; nothing is saved
3. **List order and due soon**
   - Given plans due 2026-10-01 (overdue), 2026-11-14 and 2027-03-02, and today is 2026-10-21
   - Then they are listed in that order (earliest due first); the first two are *due soon* (warning pill
     "Overdue" / "Due in 24 days") and the third is neutral ("In 4 months")
4. **Projection**
   - Given today is 2026-10-21 and plans: 210 EUR yearly due 2026-11-14, 50 EUR every 6 months due
     2026-10-01 (overdue), 450 EUR one-time due 2028-01-10
   - Then the 12-month projection is €310 (210 + 50 in Oct 2026 + 50 in Apr 2027; the 2028 plan is outside
     the window)
5. **Mark a one-time plan as paid**
   - Given a one-time plan Repairs 450 EUR due 2027-06-01
   - When I tap Mark as paid, change the amount to 470, set the date to today and save
   - Then an expense of 470 EUR, Repairs, today, is created (with the plan's note) and the plan is gone
6. **Mark a recurring plan as paid**
   - Given a yearly plan due 2026-11-14
   - When I mark it as paid
   - Then the expense is created and the plan's due date becomes 2027-11-14
7. **Overdue recurring plan**
   - Given a monthly plan due 2026-08-05 and today is 2026-10-21
   - When I mark it as paid
   - Then its due date becomes 2026-09-05 (forward from the due date, not from today) and it is still overdue
8. **Paying fails validation**
   - When the expense in the Mark as paid form is invalid (e.g. future date)
   - Then the response is 400 with field errors; no expense is created and the plan is unchanged
9. **Edit and delete a plan**
   - When I edit a plan's estimate and recurrence, or delete it and confirm
   - Then the change is saved / the plan is gone, and the projection follows; no expense is created
10. **Next due on the Garage**
    - Given "Golf" has plans and "Octavia" has none
    - When I open the Garage
    - Then Golf's card shows its earliest plan ("Insurance · Mar 2, 2027", warning style when due soon) and
      Octavia's card shows no line
11. **Empty state**
    - Given no plans
    - Then the Planned tab shows a projection of €0 and an empty state inviting me to plan an expense
12. **Another user's data**
    - When I list, create, edit, delete or pay through another user's vehicle or plan
    - Then the response is 404 and nothing changes

## Edge cases

- Note is trimmed; a blank note is stored as null. An estimate of 0 is valid.
- Due date may be in the past when created or edited (it is then overdue).
- Moving forward by N months clamps to the month's last day (Jan 31 + 1 month = Feb 28/29); later moves start
  from the stored, clamped date (accepted drift).
- Mark as paid is one transaction: the expense insert and the plan update/delete commit together or not at
  all. Paying the same plan twice concurrently: the second request sees the moved/removed plan (404 for a
  removed one-time plan; a recurring plan is advanced twice only if both requests succeed in sequence —
  accepted).
- Paying never links the expense to the plan afterwards (domain/entities.md).
- Recurring plans count in every month of the window they fall due (due + k·N months), overdue occurrences
  only once, in the current month.
- "Today" uses the server's current date (UTC).
- Vehicle deletion removes plans through `planned_expense.vehicle_id → vehicle.id ON DELETE CASCADE`.

## API impact

New tag/module `planning` (depends on `vehicles::api`, `expenses::api` for creating the expense,
`users::api` for the display currency). All operations require auth and declare 401.

- `GET /api/vehicles/{vehicleId}/planned-expenses` → `PlannedExpenseList` (`listPlannedExpenses`); 404.
- `POST /api/vehicles/{vehicleId}/planned-expenses` with `PlannedExpenseRequest` → 201 `PlannedExpense`
  (`createPlannedExpense`); 400, 404.
- `PUT /api/planned-expenses/{plannedExpenseId}` with `PlannedExpenseRequest` → `PlannedExpense`
  (`updatePlannedExpense`); 400, 404.
- `DELETE /api/planned-expenses/{plannedExpenseId}` → 204 (`deletePlannedExpense`); 404.
- `POST /api/planned-expenses/{plannedExpenseId}/pay` with `ExpenseRequest` → 201 `Expense`
  (`payPlannedExpense`); 400, 404.
- `GET /api/planned-expenses/next-due` → `[{ vehicleId, plannedExpense: PlannedExpense }]`
  (`listNextDuePlannedExpenses`), the earliest plan per vehicle, for the Garage.

Schemas:

- `PlannedExpenseRequest { category, estimatedAmount: Money, dueDate, recurrenceMonths (nullable, ≥ 1),
  note? }`.
- `PlannedExpense { id, vehicleId, category, estimatedAmount: Money (original), displayAmount: Money,
  dueDate, recurrenceMonths (nullable), note (nullable), dueSoon: boolean, createdAt }`.
- `PlannedExpenseList { projectionTotal: Money, items: PlannedExpense[] }`.

## UI notes

- **Planned tab** (screen 04) in the vehicle's bottom tab bar (added with this spec).
- Hero: "Projected · next 12 months" with the total only (no running costs, no per-month breakdown).
- Upcoming cards (`PlannedExpenseCard`): "Category · note", "date · recurrence" ("repeats yearly",
  "every 6 months", "one-time"), display amount, status pill (warning when `dueSoon`: "Overdue" / "Due in
  N days"; neutral otherwise: "In N months"), and Mark as paid (accent outline when due soon).
- **Plan an expense** (dashed button) and **edit** (tap a card): one form, not yet designed — built from
  existing tokens/components: category picker, amount + currency, due date, recurrence select (One-time,
  Every month, Every 3 months, Every 6 months, Every year, Every 2 years; the API accepts any N ≥ 1 and the
  UI shows "every N months" for other values), note. Edit has Delete with confirmation.
- **Mark as paid** opens the Add expense form (specs/expenses.md) titled "Mark as paid", pre-filled with the
  plan's amount, currency, category, due date and note; category is fixed. Save calls `pay`.
- **Garage:** each vehicle card shows its next due plan as a footer line (warning color when due soon).
- States: loading skeleton, empty (AC 11), error with retry, submitting forms, server field errors on fields.

## E2E

- Plan a recurring expense, mark it as paid, and see the new expense in the Expenses list and the plan's due
  date moved forward.

## Out of scope

- Running-cost estimates in the projection; per-month projection breakdown.
- Notifications or reminders; linking a paid expense back to its plan; skipping an occurrence; end dates for
  recurrence; plans not tied to a vehicle.
