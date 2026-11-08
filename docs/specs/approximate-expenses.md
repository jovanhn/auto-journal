# Spec: Approximate expenses

## Status

Implemented — release **v6 (approximate expenses)**

## Goal

Let a user log an expense they only know roughly (for example tires, about €300, sometime in spring 2024)
instead of leaving it out, and see in the expense list which expenses are approximate. More history gives
better insights; the marker keeps it honest. Totals and insights do not change.

Depends on: specs/expenses.md, specs/planned-expenses.md (both Implemented).

## User stories

- As a user, I want to mark an expense as approximate when I don't know its exact amount or date, so that I
  can still log it and get better totals.
- As a user, I want to see which expenses are approximate in the list, so that I know which numbers are
  guesses.

## Business rules

- BR-E6 (new): An expense can be marked as *approximate*: its amount, its date or both are a best guess. The
  flag is optional (default: not approximate) and only marks the expense; approximate expenses count like any
  other in every total and insight, with the same validation (BR-E1…E4).
- BR-PL2: mark as paid uses the same expense fields, so the flag can be set there too (default off).
- BR-C4: changing only the flag keeps the rate snapshot.

## Acceptance criteria

1. **Add an approximate expense**
   - Given my vehicle "Golf"
   - When I add an expense 300.00 EUR, Tires, 2024-04-15, and tick "Approximate"
   - Then it is created (201) with `approximate: true`, and its row shows `≈ €300.00`
2. **Default is exact**
   - When I add an expense without the flag (form unticked, or API request without `approximate`)
   - Then it is saved with `approximate: false` and its row shows no `≈`
3. **Edit the flag**
   - Given an approximate expense
   - When I open it, the checkbox is ticked; I untick it and save
   - Then it is no longer approximate; its amount, currency and rate snapshot are unchanged
4. **Totals unchanged**
   - Given expenses of €100.00 (exact) and €300.00 (approximate) in October 2026
   - Then the October header, the year and month tiles, the Garage summary and Insights count €400.00
     exactly as before (no separate approximate figures)
5. **Mark as paid**
   - Given a planned expense
   - When I mark it as paid and tick "Approximate"
   - Then the created expense is approximate; without ticking it is not
6. **Existing data**
   - Given expenses created before this release
   - Then they are not approximate

## Edge cases

- `PUT /api/expenses/{id}` replaces all fields: a request without `approximate` makes the expense exact
  (the same as for the note).
- Converted rows: the `≈` is shown before the display amount; the original amount (other currency) below is
  shown without it.

## API impact

Additive, not breaking.

- `ExpenseRequest.approximate`: boolean, optional, default `false`.
- `Expense.approximate`: boolean, required.
- Used by `createExpense`, `updateExpense`, `payPlannedExpense` and every operation returning `Expense`.
  The MCP tools `create_expense`, `update_expense` and `pay_planned_expense` take it through the contract
  schema; `create_expense`'s description tells the assistant to set it when the user says the amount or date
  is a guess ("around", "roughly", "sometime in").

Migration `V6__add_expense_approximate.sql`: `ALTER TABLE expense ADD COLUMN approximate boolean NOT NULL
DEFAULT false` (existing rows become exact).

## UI notes

- **Add / Edit expense / Mark as paid form** (screen 05): one checkbox "Approximate" with the hint "Amount or
  date is a best guess", below the date and odometer row; unticked by default, pre-filled on edit.
- **Expense row**: `≈ ` before the display amount when approximate (design.md: `≈` for estimates); the
  row's accessible text includes "approximate".
- No changes to tiles, month headers, charts, Insights or the Garage.

## E2E

- none (covered by backend integration tests and frontend component tests)

## Out of scope

- Separate flags for amount and date, a date precision (month / year), approximate odometer readings.
- Showing how much of a total is approximate; filtering approximate expenses out of insights.
