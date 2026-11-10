# Spec: Journal filters (search, type, all years)

## Status

Implemented — release **v9 (journal filters)**

## Goal

Make a vehicle's journal easy to search and look through, as in the design (Claude Design canvas
"autojournal", boards *Vehicle · Journal*, *Journal · scrolling year chips*, *Journal · desktop hover state*,
*Add journal entry · expense*): a search box, an entry type / category filter, year chips with **All**, and
tiles that show what the filters show. The add/edit form gets the design's layout.

Depends on: specs/journal.md, specs/expenses.md, specs/insights.md, specs/metric-info.md (all Implemented).

## User stories

- As a user, I want to search my journal ("brake", "Shell"), so that I find an entry without scrolling.
- As a user, I want to show only expenses, only log entries or one category, so that I see e.g. all fuel at
  once.
- As a user, I want to see every year at once, so that I see the whole history of the car.
- As a user, I want the tiles to add up what I see, so that I know what e.g. tires cost me in all years.

## Business rules

New rules are in [docs/domain/business-rules.md](../domain/business-rules.md) (marked **Planned**, v9).

- BR-J6 (new): the journal can be narrowed by period (one year or all years), entry type (all, expenses,
  log entries, or one expense category) and search text; it shows the entries that match all three.
- BR-J7 (new): the journal tiles describe the entries shown: *Spent* = sum of the shown expenses; *Avg /
  month* = Spent ÷ the months of the period (a year: as BR-I3; all years: as BR-I9); *Entries* = number of
  shown expenses and log entries.
- BR-J1 (changed): "of the selected year" becomes "of the selected period".
- BR-J3 applies: log entries never add to Spent or Avg / month.

## Acceptance criteria

1. **All years from the API**
   - Given my vehicle "Golf" with expenses and log entries in 2024, 2025 and 2026
   - When I call `GET /api/vehicles/{vehicleId}/journal`
   - Then I get every expense and log entry of the vehicle (each list newest date first, same date newest
     created first) and `firstYear` as in `ExpenseYear`; another user's vehicle is 404 (BR-U2)
2. **Year chips**
   - When I open the Golf's journal
   - Then I see chips "All", then the current year down to `firstYear`, with the current year selected; tapping
     a chip shows that period, and "All" shows every entry with month headers "October 2025"
3. **Type filter**
   - Given October 2026 has a Fuel expense, a Service expense and a log entry
   - When I choose "Expenses", "Log entries" or "Fuel"
   - Then only the matching entries are shown; "All entries" shows all three
4. **Search**
   - Given an expense "Service · Oil & filters" and a log entry "Brake noise when cold"
   - When I type "oil" (any case)
   - Then only the service expense is shown; the search matches the row title (category or "Odometer
     reading", and the note)
5. **Tiles follow the filters**
   - Given 2026 (current year, now October) has Fuel €50.00 and €40.00, Tires €380.00 and two log entries
   - When I select 2026 and "Fuel"
   - Then Spent is €90, Avg / month is €9 (÷ 10 months, BR-I3) and Entries is 2; with "All entries" Spent is
     €470 and Entries is 5
6. **All years average**
   - Given the purchase date 2024-01-15 and "All" selected in November 2026
   - Then Avg / month = Spent ÷ 35 (January 2024 … November 2026, BR-I9)
7. **Filtered and empty**
   - When any filter differs from the default (current year, all entries, no search)
   - Then "Filtered results · Clear filters" is shown, and Clear filters restores the default
   - When nothing matches, the card "No entries match — Try another search, year or entry type." with Clear
     filters is shown instead of the month groups
8. **Filters survive editing**
   - Given "All" and "Fuel" selected and the search "shell"
   - When I open an entry and save or cancel
   - Then the journal comes back with the same filters (they are in the URL)
9. **Month totals**
   - Then each month header sums the shown expenses of that month (no total when it shows no expense, as
     today)
10. **Existing operations unchanged**
    - `listExpenses` (and the MCP tool `list_expenses`), Insights and the Garage summary behave as before

## Edge cases

- Search ignores case and surrounding spaces; an empty search matches everything.
- A vehicle with no journal entries shows only the "All" and current-year chips and the empty-year state
  "No journal entries in 2026" (unfiltered) as today.
- Avg / month for the current year with no expenses is €0; for "All" when the purchase date and every
  expense are in the current month, it is Spent ÷ 1.
- Rows of a year other than the current one show the year in the date ("Mar 14, 2025").
- Up to *journal entries per vehicle* (3,000, BR-L2) entries are returned at once; no paging.
- An old URL `?year=2025` keeps working.

## API impact

Additive, not breaking.

- **New schema** `Journal { firstYear, expenses[], logEntries[] }`, all required: `firstYear` as in
  `ExpenseYear`; `expenses` (`Expense`) and `logEntries` (`LogEntry`) of all years, ordered as in
  `ExpenseYear`. No totals (the client sums `displayAmount`, BR-J7).
- **New operation** `GET /api/vehicles/{vehicleId}/journal` → `listJournal` (tag `expenses`) → 200 `Journal`;
  401, 404.
- **MCP:** no new tool; `list_expenses` stays per year (BR-A2 needs an API operation per tool, not a tool per
  operation).
- No migration, no config.

## UI notes

Follow the design boards; tokens only (design.md).

- **Journal screen** loads `listJournal` once and filters in the browser; year, type and search are URL search
  params (`year` = a year or `all`, default the current year; `type` = `expense` | `log` | a category; `q`).
- **Filter bar** under the app bar, on the page background with a bottom border: search input (search icon,
  label "Search journal", placeholder "Search") and a select ("All entries"; group *Entry type*: Expenses,
  Log entries; group *Expense category*: the eight categories), highlighted (accent border and tint) when not
  "All entries". Below: year chips in one row that scrolls sideways (selected = accent), with scroll arrows
  on hover on devices that hover. Replaces the ‹ year › switcher.
- **Tiles** Spent · Avg / month · Entries, each with ⓘ (specs/metric-info.md):
  - Spent: "Sum of the expenses shown (period, type and search). Log entries never count."
  - Avg / month: "Spent ÷ months: 12 for a past year, January to now for this year; for All, from the
    purchase date (or the first expense, if earlier) to now. Months without expenses count."
  - Entries: "Number of expenses and log entries shown."
- **Rows:** a log row shows a hollow muted ring in place of the category dot (no `NotebookPen`), otherwise as
  today. Month headers muted, 13 px; with "All" they include the year.
- **FAB** label "Add journal entry".
- **Form** (Add to journal, Edit expense, Edit log): date + odometer first, then the type control, then the
  expense fields (amount + currency, category, approximate), then the note. The type control is a switch row
  "This is an expense — Adds amount, currency and category" (on = Expense) instead of the Expense | Log
  buttons; Mark as paid has no switch, as today. Behavior (defaults, validation, conversion, the "Remove
  the cost" confirmation) is unchanged.
- States: loading skeleton, error with retry, empty year, no matches (above).
- `docs/design/design.md`: filter bar, year chips, journal tiles, log row ring, switch row, changelog entry.

## E2E

- `filter-journal` — with expenses in two years and a log entry: choose All and see both years; choose a
  category and see Spent and Entries change; search for a note; Clear filters.
- Existing flows (`add-edit-delete-expense`, `add-edit-delete-log-entry`, `convert-log-entry`,
  `plan-and-pay-expense`): locator updates ("This year" tile → "Spent", "Add" → "Add journal entry",
  Expense | Log → the switch). Their checks of the removed "This month" tile now check the same amount in the
  current month's header (or that the month has no total / no group).

## Out of scope

- Log entry types (odometer / note / car reading), readings and values — later, with Issues.
- The Issues tab.
- A vehicle picker in the form.
- Server-side search or filtering, paging.
- This month and lifetime Per km tiles on the journal (both stay on Insights).
