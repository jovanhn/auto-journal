# Critical flows

E2E covers **critical user flows only**. Every flow has a spec section, a reviewed plan, and one test file.
Edge cases belong in backend and frontend tests.

| Flow | Spec | Plan | Test |
| ---- | ---- | ---- | ---- |
| `sign-in` — sign in and reach home; reload keeps the session; sign out returns to sign-in | [docs/specs/auth.md](../docs/specs/auth.md#e2e) | [plans/sign-in.md](plans/sign-in.md) | [tests/sign-in.spec.ts](tests/sign-in.spec.ts) |
| `add-vehicle` — add a vehicle and see it in the Garage after the earlier ones | [docs/specs/vehicles.md](../docs/specs/vehicles.md#e2e) | [plans/add-vehicle.md](plans/add-vehicle.md) | [tests/add-vehicle.spec.ts](tests/add-vehicle.spec.ts) |
| `edit-delete-vehicle` — rename a vehicle, then delete it with confirmation | [docs/specs/vehicles.md](../docs/specs/vehicles.md#e2e) | [plans/edit-delete-vehicle.md](plans/edit-delete-vehicle.md) | [tests/edit-delete-vehicle.spec.ts](tests/edit-delete-vehicle.spec.ts) |
| `add-edit-delete-expense` — add an expense and see it in the list and the "This year" tile; edit it; delete it with confirmation | [docs/specs/expenses.md](../docs/specs/expenses.md#e2e) | [plans/add-edit-delete-expense.md](plans/add-edit-delete-expense.md) | [tests/add-edit-delete-expense.spec.ts](tests/add-edit-delete-expense.spec.ts) |
| `plan-and-pay-expense` — plan a recurring expense, mark it as paid, see the expense in the Expenses list and the plan's due date moved forward | [docs/specs/planned-expenses.md](../docs/specs/planned-expenses.md#e2e) | [plans/plan-and-pay-expense.md](plans/plan-and-pay-expense.md) | [tests/plan-and-pay-expense.spec.ts](tests/plan-and-pay-expense.spec.ts) |
