# Plan: report-and-resolve-issue

- **Spec:** [`docs/specs/issues.md`](../../docs/specs/issues.md) (section *E2E*; acceptance criteria 1, 5, 8 and 11)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/report-and-resolve-issue.spec.ts`
- **Status:** Reviewed 2026-11-10

## Critical flow: add an issue, see it under Open, resolve it as Fixed, see it under Resolved, reopen it

Starting state: the app is running and the E2E test user is signed in. Setup (via the `api` fixture): a vehicle
with a unique nickname `A` exists. `I` is a unique issue title. "Today" is the browser's current date `T`
(shown like `Nov 10` in a row and `Nov 10, 2026` with the year).

Because every test shares one user, the flow only looks at vehicle `A`, which no other test touches.

### 1. The new vehicle has no issues

1. Open the Garage (`/`), click the card of vehicle `A`, then the **Issues** tab (4th tab).

Expected:
- The **Issues** tab is the current tab; the subtitle is "Issues".
- An empty state says "No open issues" and "Note a warning light, a noise or something your mechanic said to
  keep an eye on."
- There is no "Resolved" button.

### 2. Add an issue

1. Click **Add issue**. Expect the **New issue** form with **Watch** and **I noticed** selected and **Date
   noticed** `T`.
2. Enter **Title** `I`, select **Fix soon** and **Mechanic**, enter **Odometer** `184200` and **Note**
   "Replace within ~5,000 km".
3. Click **Save issue**.

Expected:
- A toast says "Issue added" and the Issues tab of `A` is shown again.
- The heading "Open · 1" is shown; the open list has one row: `I`, "Mechanic · `T` · 184,200 km" and the pill
  "Fix soon".

### 3. Resolve it as Fixed

1. Click the row `I`. Expect **Edit issue** with the title `I`.
2. Click **Resolve issue**. Expect the **Resolve issue** sheet with **Fixed** selected and **Date resolved** `T`.
3. Click **Resolve**.

Expected:
- A toast says "Issue resolved" and the Issues tab of `A` is shown again.
- "No open issues" and "Nothing to keep an eye on right now." are shown.
- A collapsed button "Resolved · 1" (`aria-expanded="false"`); after clicking it, the resolved list has one
  row: `I`, "Fixed · `T` with the year".

### 4. Open it and reopen it

1. Click the resolved row `I`. Expect the **Resolved issue** screen: pill "Fixed", heading `I`, "Resolved `T`
   with the year", Severity "Fix soon", Source "Mechanic", Noticed "`T` with the year · 184,200 km" and the
   note.
2. Click **Reopen issue**.

Expected:
- A toast says "Issue reopened" and the Issues tab of `A` is shown again.
- "Open · 1" with the row `I`, "Mechanic · `T` · 184,200 km" and "Fix soon"; no "Resolved" button.
