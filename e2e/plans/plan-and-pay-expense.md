# Plan: plan-and-pay-expense

- **Spec:** [`docs/specs/planned-expenses.md`](../../docs/specs/planned-expenses.md) (section *E2E*; acceptance criteria 1, 6, 10 and 11)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/plan-and-pay-expense.spec.ts`
- **Status:** Reviewed 2026-10-31

## Critical flow: plan a recurring expense, mark it as paid, and see the new expense in the Expenses list and the plan's due date moved forward

Starting state: the app is running and the E2E test user is signed in (display currency EUR). Setup (via the
`api` fixture): a vehicle with a unique nickname `A` exists. `N` is a unique note. "Today" is the browser's
current date `T`; `T+1y` is the same day next year (shown like `Nov 1, 2027`).

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The new vehicle has nothing planned

1. Open the Garage (`/`), click the card of vehicle `A`, then the **Planned** tab.

Expected:
- The **Planned** tab is the current tab; the subtitle is "Planned expenses".
- The hero "Projected · next 12 months" shows `≈ €0`.
- An empty state says "Nothing planned yet".

### 2. Plan a recurring expense

1. Click **Plan an expense**. Expect the **Plan an expense** form; **Currency** is `EUR`.
2. Enter **Estimated amount** `320`, pick **Insurance**, enter **Due date** `T`, choose **Repeats**
   "Every year", and **Note** `N`.
3. Click **Save plan**.

Expected:
- A toast says "Expense planned" and the Planned tab of `A` is shown again.
- A card "Insurance · `N`" shows `T` (e.g. `Oct 31, 2026`) · "repeats yearly", `€320` and the warning pill
  "Due today".
- The hero shows `≈ €320`.
- Back on the Garage, the card of `A` shows the line "Insurance · `T`".

### 3. Mark it as paid

1. Open the Planned tab of `A` again and click **Mark as paid** on the card "Insurance · `N`".
2. Expect the **Mark as paid** form: **Amount** `320.00`, **Currency** `EUR`, **Category** `Insurance`
   (not changeable), **Date** `T`, **Note** `N`.
3. Replace **Amount** with `330` and click **Save expense**.

Expected:
- A toast says "Expense recorded" and the Planned tab of `A` is shown again.
- The card "Insurance · `N`" now shows `T+1y` · "repeats yearly" and a neutral pill ("In 12 months" or
  "In 11 months" at a month end); there is still exactly one card.

### 4. The expense is in the Expenses list

1. Click the **Expenses** tab.

Expected:
- A row "Insurance · `N`" shows today's short date and `€330.00`.
- The **This month** tile shows `€330`.
