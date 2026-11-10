# Plan: convert-log-entry

- **Spec:** [`docs/specs/journal.md`](../../docs/specs/journal.md) (section *E2E*; acceptance criteria 16 and 17)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/convert-log-entry.spec.ts`
- **Status:** Reviewed 2026-11-10

## Critical flow: turn a log entry into an expense and see the "This year" tile include it; turn it back into a log entry (confirming) and see the tile drop it

Starting state: the app is running and the E2E test user is signed in (display currency EUR). Setup (via the
`api` fixture): a vehicle with a unique nickname `A` (odometer at start 184,320 km) and, dated today, one log
entry with odometer 185,000 km and a unique note `N`. "Today" is the browser's current date.

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The journal shows the log entry and no cost

1. Open the vehicle page of `A` (Garage → card `A`).

Expected:
- A row `N` shows today's short date and `185,000 km`, without an amount.
- The **This year** tile shows `€0`.

### 2. Turn the log entry into an expense

1. Click the row `N`. Expect the **Edit log** form with **Log** selected.
2. Click **Expense**. Expect **Amount**, **Currency** (`EUR`, the display currency) and the categories to appear;
   **Date**, **Odometer** `185000` and **Note** `N` are kept.
3. Enter **Amount** `25.00`, pick **Other**, and click **Save changes**.

Expected:
- A toast says "Saved as an expense" and the vehicle page of `A` is shown again.
- The row "Other · `N`" shows today's short date, `185,000 km` and `€25.00`.
- The **This year** tile shows `€25`.

### 3. Cancelling the cost removal keeps the expense

1. Click the row "Other · `N`". Expect the **Edit expense** form with **Expense** selected and **Amount** `25.00`.
2. Click **Log** (the cost fields are hidden; **Note** `N` is kept), then **Save changes**. Expect a
   confirmation dialog "Remove the cost from this entry?".
3. Click **Cancel**.

Expected:
- The dialog closes and the **Edit expense** form is still shown; nothing was saved.

### 4. Turn the expense back into a log entry

1. Click **Save changes** again, then **Remove cost** in the confirmation dialog.

Expected:
- A toast says "Saved as a log" and the vehicle page of `A` is shown again.
- The row `N` shows today's short date and `185,000 km`, without an amount.
- The **This year** tile shows `€0` again.
