# Plan: edit-delete-vehicle

- **Spec:** [`docs/specs/vehicles.md`](../../docs/specs/vehicles.md) (section *E2E*; acceptance criteria 8 and 9)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/edit-delete-vehicle.spec.ts`
- **Status:** Reviewed 2026-10-30 (revised for specs/expenses.md: Edit vehicle opens from the vehicle's app
  bar; Delete moved to the bottom of the Edit vehicle form)

## Critical flow: rename a vehicle, then delete it with confirmation

Starting state: the app is running and the E2E test user is signed in. Setup (via the `api` fixture): a
vehicle with a unique nickname `A` exists. `B` is another unique nickname.

### 1. Rename the vehicle

1. Open the Garage (`/`) and click the card of vehicle `A`.
2. Expect the vehicle page with heading `A`.
3. Click **Edit vehicle** in the app bar. Expect the **Edit vehicle** form with **Nickname** pre-filled with `A`.
4. Replace **Nickname** with `B` and click **Save changes**.

Expected:
- A toast says "Changes saved".
- The vehicle page shows the heading `B`.

### 2. Cancelling the delete confirmation keeps the vehicle

1. Click **Edit vehicle** again, then **Delete vehicle** at the bottom of the form. Expect a confirmation
   dialog titled "Delete B?" that names what will be deleted.
2. Click **Cancel**.

Expected:
- The dialog closes and the **Edit vehicle** form still shows **Nickname** `B`.

### 3. Delete the vehicle

1. Click **Delete vehicle**, then **Delete vehicle** in the confirmation dialog.

Expected:
- The URL is `/` and the **Garage** heading is visible; a toast says "B deleted".
- The Garage has no card for `B` (and none for `A`).
- Opening the vehicle's page again by its URL shows "Could not load the vehicle" (the API responds 404).
