# Plan: filter-journal

- **Spec:** [`docs/specs/journal-filters.md`](../../docs/specs/journal-filters.md) (section *E2E*; acceptance criteria 2–5, 7)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/filter-journal.spec.ts`
- **Status:** Reviewed 2026-11-10

## Critical flow: choose All and see both years; choose a category and see Spent and Entries change; search for a note; Clear filters

Starting state: the app is running and the E2E test user is signed in (display currency EUR). Setup (via the
`api` fixture, which gets a new `createExpense`): a vehicle with a unique nickname `A` and
- an expense **Fuel €50.00** with the unique note `F`, dated today;
- an expense **Service €120.00** with the unique note `S`, dated 1 March of last year;
- a log entry with the unique note `L`, dated today.

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The journal opens on the current year

1. Open the vehicle page of `A` (Garage → card `A`).

Expected:
- The year chips show **All**, the current year (selected) and last year.
- The rows "Fuel · `F`" and `L` are shown; "Service · `S`" is not.
- The tiles show **Spent** `€50` and **Entries** `2`. No "Filtered results" row.

### 2. All years

1. Click the **All** chip.

Expected:
- "Service · `S`" is shown too, under a month header "March <last year>".
- **Spent** `€170`, **Entries** `3`. "Filtered results" is shown.

### 3. One category

1. In **Entry type**, choose **Service**.

Expected:
- Only "Service · `S`" is shown.
- **Spent** `€120`, **Entries** `1`.

### 4. Search

1. In **Entry type**, choose **All entries**.
2. Type `L` (the log entry's unique note) into **Search journal**.

Expected:
- Only the row `L` is shown.
- **Spent** `€0`, **Entries** `1`.

### 5. Clear filters

1. Click **Clear filters**.

Expected:
- The search box is empty, the current-year chip is selected and "Filtered results" is gone.
- The rows "Fuel · `F`" and `L` are shown again; **Spent** `€50`, **Entries** `2`.

## Changes to existing flows (locators only, assertions unchanged)

- `add-edit-delete-expense`, `add-edit-delete-log-entry`, `convert-log-entry`: the **This year** tile is now
  **Spent** (same amounts for the current year); the FAB is **Add journal entry**; **Expense | Log** is the
  switch **This is an expense** (on = Expense, off = Log).
