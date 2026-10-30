# Plan: add-vehicle

- **Spec:** [`docs/specs/vehicles.md`](../../docs/specs/vehicles.md) (section *E2E*; acceptance criterion 1)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** `e2e/tests/add-vehicle.spec.ts`
- **Status:** Reviewed 2026-10-30

## Critical flow: add a vehicle and see it in the Garage

Starting state: the app is running and the E2E test user is signed in. The user may already have vehicles
from earlier runs; the test uses a unique nickname. The display currency is EUR (the default).
Setup (via the `api` fixture): a vehicle `E` with a unique nickname is added just before the flow. Other
tests add vehicles for the same user in parallel, so "last" is checked as "after `E`" (BR-V8).

### 1. Add a vehicle

1. Open the Garage (`/`).
2. Click **Add vehicle**.
3. Expect the **New vehicle** form; the **Currency** select shows `EUR`.
4. Fill **Nickname** with a unique name, **Make** `VW`, **Model** `Golf 7`, **Year** `2016`,
   **Current odometer (km)** `184320`, **Price paid** `8500` and **Date bought** `2023-05-10`.
   Leave **Plate (optional)** empty.
5. Click **Add to garage**.

Expected:
- The URL is `/` and the **Garage** heading is visible.
- A toast says "<nickname> added to your garage".
- The **Vehicles** list contains a card for the new vehicle, listed **after** `E`.
- The card shows "VW Golf 7 · 2016 · 184,320 km" and "Value €8,500".
