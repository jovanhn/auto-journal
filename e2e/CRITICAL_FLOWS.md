# Critical flows

E2E covers **critical user flows only**. Every flow has a spec section, a reviewed plan, and one test file.
Edge cases belong in backend and frontend tests.

| Flow | Spec | Plan | Test |
| ---- | ---- | ---- | ---- |
| `sign-in` — sign in and reach home; reload keeps the session; sign out returns to sign-in | [docs/specs/auth.md](../docs/specs/auth.md#e2e) | [plans/sign-in.md](plans/sign-in.md) | [tests/sign-in.spec.ts](tests/sign-in.spec.ts) |
| `add-vehicle` — add a vehicle and see it in the Garage after the earlier ones | [docs/specs/vehicles.md](../docs/specs/vehicles.md#e2e) | [plans/add-vehicle.md](plans/add-vehicle.md) | [tests/add-vehicle.spec.ts](tests/add-vehicle.spec.ts) |
| `edit-delete-vehicle` — rename a vehicle, then delete it with confirmation | [docs/specs/vehicles.md](../docs/specs/vehicles.md#e2e) | [plans/edit-delete-vehicle.md](plans/edit-delete-vehicle.md) | [tests/edit-delete-vehicle.spec.ts](tests/edit-delete-vehicle.spec.ts) |
| `add-edit-delete-expense` — add an expense and see it in the list and the "This year" tile; edit it; delete it with confirmation | [docs/specs/expenses.md](../docs/specs/expenses.md#e2e) | [plans/add-edit-delete-expense.md](plans/add-edit-delete-expense.md) | [tests/add-edit-delete-expense.spec.ts](tests/add-edit-delete-expense.spec.ts) |
| `plan-and-pay-expense` — plan a recurring expense, mark it as paid, see the expense in the journal and the plan's due date moved forward | [docs/specs/planned-expenses.md](../docs/specs/planned-expenses.md#e2e) | [plans/plan-and-pay-expense.md](plans/plan-and-pay-expense.md) | [tests/plan-and-pay-expense.spec.ts](tests/plan-and-pay-expense.spec.ts) |
| `add-edit-delete-log-entry` — add a log entry with an odometer reading, see it in the journal and the current odometer update; edit its note; delete it with confirmation | [docs/specs/journal.md](../docs/specs/journal.md#e2e) | [plans/add-edit-delete-log-entry.md](plans/add-edit-delete-log-entry.md) | [tests/add-edit-delete-log-entry.spec.ts](tests/add-edit-delete-log-entry.spec.ts) |
| `convert-log-entry` — turn a log entry into an expense and see the "This year" tile include it; turn it back into a log entry (confirming) and see the tile drop it | [docs/specs/journal.md](../docs/specs/journal.md#e2e) | [plans/convert-log-entry.md](plans/convert-log-entry.md) | [tests/convert-log-entry.spec.ts](tests/convert-log-entry.spec.ts) |
