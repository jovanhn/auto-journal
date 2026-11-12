# Spec: Issue expenses

## Status

Planned — release **v11 (issue expenses)**

## Goal

When resolving an issue, let a user record what it cost: link an expense already in the journal, or add a new
expense in the same step. The resolved issue shows that expense, so the user sees what each problem cost.

Depends on: specs/issues.md (v10), specs/journal.md, specs/expenses.md. Architecture: ADR 0021.

## User stories

- As a user, I want to add the repair expense while resolving an issue, so that I enter it once.
- As a user, I want to link an expense I already logged (e.g. the service where it was fixed), so that I
  don't enter it twice.
- As a user, I want to see what a resolved issue cost, so that I know what each problem cost me.

## Business rules

New rules are in [docs/domain/business-rules.md](../domain/business-rules.md) (marked **Planned**, v11).

- BR-IS7 (new): resolving can link one expense: an existing one of the same vehicle, or a new one created in
  the same step.
- BR-IS8 (new): the link is cleared when the expense is deleted or turned into a log entry, and on reopen;
  the expense itself never changes because of an issue.
- BR-IS4 (changed): reopening also clears the link.
- BR-L2, BR-E1…E6, BR-C4 apply to the new expense.

## Acceptance criteria

1. **Resolve and add an expense**
   - Given the open issue "Brake pads at ~30%" on the Golf
   - When I resolve it as Fixed on 2026-10-21 with a new expense: 186.00 EUR, Repairs, odometer 184,320, note
     "Front brake pads replaced"
   - Then the issue is resolved and linked to the new expense; the expense is in the Golf's journal on
     2026-10-21 and counts in the totals; the Resolved row shows €186 and the resolved issue screen shows the
     linked expense "Repairs · Front brake pads replaced", Oct 21, 2026, €186
2. **The new expense must be valid**
   - When the new expense is invalid (e.g. no category, future date)
   - Then the response is 400 with field errors prefixed `expense.` (e.g. `expense.category`), no expense is
     created and the issue stays open
   - When the vehicle is at the journal entry limit
   - Then the response is 409 (BR-L2), no expense is created and the issue stays open
3. **Resolve and link an existing expense**
   - Given the Golf has a Service expense of €145 on 2026-10-03
   - When I resolve an issue choosing "Link existing" and that expense
   - Then the issue is resolved and linked to it; the expense is unchanged
4. **Link rules**
   - When I link an expense of another vehicle, another user's expense, a log entry's id or an unknown id
   - Then the response is 404 and the issue stays open
   - When I send both an existing expense and a new one
   - Then the response is 400 and nothing changes
5. **One expense, several issues**
   - Given an expense already linked to one issue
   - When I resolve another issue linking the same expense
   - Then both issues show it
6. **Expense deleted or turned into a log entry**
   - Given a resolved issue linked to an expense
   - When I delete that expense, or turn it into a log entry
   - Then the issue stays resolved (same outcome and date) with no linked expense
7. **Reopen**
   - Given a resolved issue linked to an expense
   - When I reopen it
   - Then it is open with no link, and the expense is still in the journal, unchanged
8. **Deleting an issue**
   - When I delete a resolved issue linked to an expense
   - Then the expense is unchanged
9. **Resolve without an expense still works**
   - When I resolve with "None"
   - Then it behaves as in specs/issues.md AC 5
10. **Assistant**
    - When Claude calls `resolve_issue` with an existing expense id or a new expense, or `list_issues`
    - Then the result is the same as through the API (BR-A1), including the linked expense

## Edge cases

- The linked expense's amount is shown in the display currency at its rate snapshot (BR-C4, BR-C6), like in
  the journal.
- An expense dated before the date noticed can be linked (the server checks only vehicle and owner); the
  picker only offers expenses dated on or after it.
- The new expense's date defaults to the resolved date in the UI but may differ; it follows BR-E2, not the
  resolve rules.
- Resolving with a new expense is one transaction: the expense insert and the issue update commit together
  or not at all (as BR-PL2).
- Changing the linked expense of a resolved issue: reopen and resolve again (no separate operation).
- Deleting a vehicle removes its expenses and issues; the link needs nothing extra.

## API impact

Additive, not breaking.

- **Changed schemas**
  - `ResolveIssueRequest` gains `expenseId?` (uuid) and `expense?` (`ExpenseRequest`); at most one of them
    (400 otherwise).
  - `Issue` gains `expense` (nullable `LinkedExpense`), required.
  - New `LinkedExpense { id, date, category, note (nullable), displayAmount: Money }`.
- **Changed operations:** `resolveIssue` may return 409 for the journal entry limit too (BR-L2), and 404 for
  an expense that is not one of the vehicle's expenses.
- **`expenses::api`:** `ExpenseApi` gains a read method returning the owner's expenses by ids for one vehicle,
  with display amounts (used to validate a link and to fill `Issue.expense`); `create` is reused for the new
  expense. The conversion stays in the `expenses` module.
- **MCP:** `resolve_issue` takes the new optional fields; tool descriptions explain the three choices. No new
  tools.
- **Migration** `V9__add_issue_expense.sql`: `ALTER TABLE issue ADD COLUMN expense_id uuid NULL REFERENCES
  expense (id) ON DELETE SET NULL`, index on `expense_id`. The FK targets `expense`, not `journal_entry`, so
  turning the expense into a log entry also clears the link (ADR 0021).
- **Backend:** `issues` now also depends on `expenses::api` (Modulith check); `docs/architecture.md` updated.

## UI notes

- **Resolve issue** sheet gains the **Expense** segmented control: None | Link existing | Add new (default
  None).
  - Link existing: a select "Link to an expense" with the vehicle's expenses dated on or after the date
    noticed, newest first, shown as "<category>[ · note] · <amount> · <date>"; hint "Expenses from <vehicle>’s
    journal, newest first". Data from `listJournal`, filtered in the client. Empty: "No expenses to link".
  - Add new: Amount (currency defaults to the display currency), Category (default Repairs), Odometer, Note
    (default the issue title); hint "Added to <vehicle>’s journal as an expense on the resolved date, linked
    to this issue". Button "Resolve & add expense".
- **Resolved rows** show the linked expense's display amount on the right; none without a link.
- **Resolved issue** screen: section "Linked expense" with the expense row (category · note, date, amount),
  tapping it opens the expense's edit screen.
- Server field errors `expense.*` map onto the Add new fields. Invalidate the journal and insights queries
  after a resolve with a new expense, and the issues query after deleting or converting an expense.

## E2E

- `resolve-issue-with-expense` — resolve an issue adding a new expense, see the amount on the resolved issue
  and the expense in the journal; reopen the issue and see the expense still in the journal.

## Out of scope

- Showing the linked issue on the expense or in the journal (it would make `expenses` read `issues`, ADR
  0021).
- Warning before deleting a linked expense.
- Linking several expenses to one issue; linking without resolving; changing the link of a resolved issue
  without reopening.
- Linking planned expenses; estimated cost.
