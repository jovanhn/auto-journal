# Spec: Vehicles (Garage)

## Status

Planned

## Goal

Let a signed-in user keep a list of their cars — add, view, edit and delete a vehicle — so that expenses
and plans can be recorded per vehicle. This is the first car-expense module (`vehicles`) and replaces the
projects/tasks example as the reference module.

Depends on: specs/auth.md (every request is scoped to the signed-in user).

## User stories

- As a user, I want to add a car with its basic data, so that I can track its costs.
- As a user, I want to see all my cars in the Garage, so that I can pick one.
- As a user, I want to correct a car's data, so that mistakes don't distort my numbers.
- As a user, I want to delete a car I no longer have, together with everything recorded for it.

## Business rules

- BR-U2: A user sees and changes only their own vehicles; another user's vehicle responds 404.
- BR-C1, BR-C2, BR-C4, BR-C6: purchase price is Money (EUR/RSD/USD, 2 decimals, ≥ 0), defaults to the
  display currency, stores a rate snapshot when saved, and the car value is shown in the display currency.
- BR-V1: Nickname, make, model, year, odometer at start, purchase price and purchase date are required;
  plate is optional.
- BR-V2: Year is between 1900 and next calendar year.
- BR-V3: Purchase date is not in the future; odometer at start is ≥ 0.
- BR-V4: Nickname is unique among one user's vehicles, case-insensitive. Plate is not unique.
- BR-V5: Current odometer = max(odometer at start, expense odometer readings). Until expenses exist it
  equals the odometer at start.
- BR-V6: A vehicle can be edited and deleted; deleting also deletes its expenses and planned expenses.
- BR-V7: Car value equals the purchase price.
- BR-V8: Vehicles are listed in the order they were added (oldest first).

## Acceptance criteria

1. **Add a vehicle**
   - Given the Add vehicle form
   - When I submit nickname "Golf", make "VW", model "Golf 7", year 2016, odometer 184320, price 8500 EUR,
     purchase date 2023-05-10, no plate
   - Then the vehicle is created (201) and owned by me, and it appears last in the Garage with
     "VW Golf 7 · 2016 · 184,320 km" and value €8,500
2. **Required fields and limits**
   - When I submit without any required field, or with year 1899 / next year + 1, a future purchase date,
     a negative odometer or price, or a price with more than 2 decimals
   - Then the request is rejected with 400 and a field error per invalid field; nothing is saved
3. **Duplicate nickname**
   - Given I have a vehicle "Golf"
   - When I add or rename another vehicle to "golf " (different case, extra spaces)
   - Then the request is rejected with 409 and a field error `nickname`
4. **Same nickname for different users**
   - Given another user has a vehicle "Golf"
   - When I add a vehicle "Golf"
   - Then it is created
5. **Garage list**
   - Given I have vehicles added in the order "Golf", "Octavia"
   - When I open the Garage
   - Then I see exactly my vehicles in that order, each with nickname, make, model, year, current odometer
     and value; no other user's vehicles
6. **Empty Garage**
   - Given I have no vehicles
   - When I open the Garage
   - Then I see an empty state inviting me to add my first vehicle
7. **Value in display currency**
   - Given my display currency is EUR and a vehicle bought for 1,000,000 RSD with a snapshot of
     117.00 RSD per EUR
   - When I open the Garage
   - Then its value is shown as €8,547.01, and the vehicle detail also shows the original price
     1,000,000.00 RSD
8. **Edit a vehicle**
   - Given my vehicle "Golf"
   - When I change its model, plate and odometer at start
   - Then the changes are saved and shown; changing the price amount or currency takes a new rate snapshot
     (BR-C4), editing other fields keeps the existing snapshot
9. **Delete a vehicle**
   - Given my vehicle "Golf"
   - When I delete it and confirm
   - Then it is gone from the Garage and `GET` of it responds 404; cancelling the confirmation deletes nothing
10. **Another user's vehicle**
    - Given a vehicle owned by another user
    - When I get, edit or delete it by id
    - Then the response is 404 and nothing changes
11. **Example scaffold removed**
    - When this spec is implemented
    - Then the projects/tasks example (backend modules, tables, contract paths, frontend features, e2e tests,
      `specs/projects-overview.md`) no longer exists, and `vehicles` is the reference module in the docs

## Edge cases

- Text fields are trimmed; a blank plate is stored as null; a nickname of only spaces is invalid.
- Year bound "next calendar year" and "not in the future" use the server's current date (UTC).
- Editing the odometer at start below an existing expense reading is allowed; current odometer still follows
  BR-V5.
- Delete is idempotent from the user's view: deleting an already-deleted vehicle responds 404.
- Concurrent rename to the same nickname: the unique index decides; the loser gets 409, never 500.
- Deleting a vehicle must also delete rows of later modules (expenses, planned expenses). Those modules add
  their cleanup when they are built (database `ON DELETE CASCADE` or a module event — decided in their spec).

## API impact

New tag/module `vehicles`. All operations require auth (ADR 0013) and declare 401.

- `GET /api/vehicles` → `Vehicle[]` (`listVehicles`). Not paginated: a user has a handful of cars.
- `POST /api/vehicles` with `CreateVehicleRequest` → 201 `Vehicle` (`createVehicle`); 400, 409.
- `GET /api/vehicles/{vehicleId}` → `Vehicle` (`getVehicle`); 404.
- `PUT /api/vehicles/{vehicleId}` with `UpdateVehicleRequest` (same fields as create) → `Vehicle`
  (`updateVehicle`); 400, 404, 409.
- `DELETE /api/vehicles/{vehicleId}` → 204 (`deleteVehicle`); 404.

Schemas:

- `Money { amount: string, currency: Currency }` — `amount` is a decimal **string** (pattern
  `^\d{1,10}(\.\d{1,2})?$`) so no precision is lost in JSON. Shared by all later modules.
- `CreateVehicleRequest { nickname, make, model, year, plate?, odometerAtStart, purchasePrice: Money,
  purchaseDate }` with the limits from `domain/entities.md`.
- `Vehicle { id, nickname, make, model, year, plate (nullable), odometerAtStart, currentOdometer,
  purchasePrice: Money (original), value: Money (in display currency), purchaseDate, createdAt }`.

Breaking: removing the projects/tasks paths, operations and schemas (approved: example scaffold,
domain decision 1a).

## UI notes

- **Garage** (screen 01): app title, the list of vehicle cards (nickname; make model · year · current
  odometer; value), dashed "Add vehicle" button. The all-cars summary, per-card "this year" spend and
  "next due" line are **not** part of this spec — they come with specs/expenses.md and
  specs/planned-expenses.md. Settings entry in the app bar (specs/auth.md).
- **Add vehicle** (screen 06): fields as in the mock; the odometer label stays "Current odometer (km)" with
  the hint "Used as the starting point for cost per km." Price gets a currency select (default display
  currency). Save / "Add to garage" submit; Cancel returns to the Garage.
- **Vehicle detail / edit:** tapping a card opens the vehicle (screen 02 is its Expenses tab, built in
  specs/expenses.md). Until then the vehicle page shows its data with Edit and Delete. Edit reuses the Add
  vehicle form, pre-filled. Delete asks for confirmation naming what will be deleted.
- States: loading skeleton for the list, empty state (AC 6), error with retry, submitting state on forms,
  field errors from the server (400/409) mapped onto fields.

## E2E

- Add a vehicle and see it in the Garage (signed in as the E2E test user).
- Edit a vehicle's nickname, then delete it with confirmation.

## Out of scope

- Expenses, planned expenses and every figure derived from them (spend this year, all-cars summary,
  next due, cost per km).
- Estimated car value from age or market data, photos, VIN lookup, archiving sold cars, sharing vehicles,
  reordering the Garage.
