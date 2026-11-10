# Plan: add-edit-delete-log-entry

- **Spec:** [`docs/specs/journal.md`](../../docs/specs/journal.md) (section *E2E*; acceptance criteria 1, 2, 6 and 8)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/add-edit-delete-log-entry.spec.ts`
- **Status:** Reviewed 2026-11-10

## Critical flow: add a log entry with an odometer reading, see it in the journal and the current odometer in the app bar update; edit its note; delete it with confirmation

Starting state: the app is running and the E2E test user is signed in (display currency EUR). Setup (via the
`api` fixture): a vehicle with a unique nickname `A` and odometer at start 184,320 km exists. `N` is a unique
note. "Today" is the browser's current date; the current month is named `M` (e.g. "November").

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The new vehicle has an empty journal

1. Open the Garage (`/`) and click the card of vehicle `A`.

Expected:
- The vehicle page shows the heading `A`, the subtitle ends with `184,320 km`, and the tab bar shows **Journal**.
- An empty state says "No journal entries in <current year>".

### 2. Add a log entry with an odometer reading

1. Click **Add**. Expect the **Add to journal** form with **Expense** selected.
2. Click **Log**. Expect **Amount** and the categories to be hidden and the hint "Add an odometer reading, a
   note, or both"; **Date** is today.
3. Enter **Odometer** `185,000` and click **Save**.

Expected:
- A toast says "Log added" and the vehicle page of `A` is shown again.
- Under the month heading `M`, a row "Odometer reading" shows today's short date and `185,000 km`, and no amount.
  The month heading shows no total (the month has only a log entry).
- The **This year** and **This month** tiles still show `€0` (log entries never count).
- The subtitle ends with `185,000 km` (the current odometer follows the reading).

### 3. Edit its note

1. Click the row "Odometer reading". Expect the **Edit log** form with **Log** selected and **Odometer** `185000`.
2. Enter **Note** `N` and click **Save changes**.

Expected:
- A toast says "Changes saved" and the vehicle page of `A` is shown again.
- The row now shows `N` as its title, with today's short date and `185,000 km`.

### 4. Cancelling the delete confirmation keeps the log entry

1. Click the row `N`, then **Delete log**. Expect a confirmation dialog "Delete this log entry?".
2. Click **Cancel**.

Expected:
- The dialog closes and the **Edit log** form is still shown with **Note** `N`.

### 5. Delete the log entry

1. Click **Delete log**, then **Delete** in the confirmation dialog.

Expected:
- A toast says "Log deleted" and the vehicle page of `A` is shown again.
- No row `N` is left; the empty state "No journal entries in <current year>" is shown again.
- The subtitle ends with `184,320 km` again.
