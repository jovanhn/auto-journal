# Plan: add-edit-delete-expense

- **Spec:** [`docs/specs/expenses.md`](../../docs/specs/expenses.md) (section *E2E*; acceptance criteria 1, 5, 7, 8 and 9)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/add-edit-delete-expense.spec.ts`
- **Status:** Reviewed 2026-10-30

## Critical flow: add an expense and see it in the list and in the "This year" tile; edit it; delete it with confirmation

Starting state: the app is running and the E2E test user is signed in (display currency EUR). Setup (via the
`api` fixture): a vehicle with a unique nickname `A` and odometer at start 184,320 km exists. `N` is a unique
note. "Today" is the browser's current date; the current month is named `M` (e.g. "October").

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The new vehicle has no expenses

1. Open the Garage (`/`) and click the card of vehicle `A`.

Expected:
- The vehicle page shows the heading `A` and the subtitle ends with `184,320 km`.
- The **This year** and **This month** tiles show `€0`.
- An empty state says "No expenses in <current year>".

### 2. Add an expense

1. Click **Add expense**. Expect the **New expense** form; **Currency** is `EUR` and **Date** is today.
2. Enter **Amount** `52.40`, pick the **Fuel** category, enter **Odometer** `184,500`, and **Note** `N`.
3. Click **Save expense**.

Expected:
- A toast says "Expense added" and the vehicle page of `A` is shown again.
- Under the month heading `M`, a row "Fuel · `N`" shows today's short date, `184,500 km` and `€52.40`.
- The **This year** and **This month** tiles show `€52.40`.
- The subtitle ends with `184,500 km` (the current odometer follows the reading).

### 3. Edit the expense

1. Click the row "Fuel · `N`". Expect the **Edit expense** form with **Amount** `52.40`, **Fuel** selected and
   **Note** `N`.
2. Replace **Amount** with `60` and click **Save changes**.

Expected:
- A toast says "Changes saved" and the vehicle page of `A` is shown again.
- The row "Fuel · `N`" shows `€60.00`; the **This year** tile shows `€60`.

### 4. Cancelling the delete confirmation keeps the expense

1. Click the row "Fuel · `N`", then **Delete expense**. Expect a confirmation dialog "Delete this expense?".
2. Click **Cancel**.

Expected:
- The dialog closes and the **Edit expense** form is still shown with **Amount** `60.00`.

### 5. Delete the expense

1. Click **Delete expense**, then **Delete** in the confirmation dialog.

Expected:
- A toast says "Expense deleted" and the vehicle page of `A` is shown again.
- No row "Fuel · `N`" is left; the empty state "No expenses in <current year>" is shown again.
- The **This year** tile shows `€0` and the subtitle ends with `184,320 km` again.
