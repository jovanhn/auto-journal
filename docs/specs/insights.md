# Spec: Insights

## Status

Implemented — release **v2**

E2E: none (covered by `InsightsApiIntegrationTest` and `InsightsPage.test.tsx`).

## Goal

Show a user where a car's money goes in a year — total, average per month, month by month and by category —
and what the car costs per km over its whole history. Read-only; no new data is entered.

Depends on: specs/vehicles.md, specs/expenses.md.

## User stories

- As a user, I want to see a car's spending per month for a year, so that I spot expensive months.
- As a user, I want to see spending by category, so that I know what costs the most.
- As a user, I want to see the average monthly cost, so that I can budget.
- As a user, I want to see the cost per km, so that I know what driving this car really costs.

## Business rules

- BR-U2: Only the vehicle's owner sees its insights; otherwise 404.
- BR-C6: All figures are in the display currency; expenses and purchase price use their rate snapshots.
- BR-I1: Yearly and monthly totals = sum of expenses dated in that year / month.
- BR-I2: Category breakdown = sum per category for the selected year, with its share of the total.
- BR-I3: Average monthly cost = the year's total ÷ months elapsed in that year (12 for a past year, January
  through the current month for the current year).
- BR-I4: Cost per km (lifetime) = (all expenses + purchase price) ÷ distance driven; not shown when distance
  driven is 0.
- BR-V5, BR-V7: current odometer; car value = purchase price.

## Acceptance criteria

1. **Year figures**
   - Given "Golf" with 2026 expenses totalling €2,148 and it is October 2026
   - When I open Insights for 2026
   - Then Total spent is €2,148 and Avg per month is €214.80 (÷ 10)
2. **Past year average**
   - Given 2025 expenses totalling €1,200
   - When I switch to 2025
   - Then Avg per month is €100 (÷ 12)
3. **By month chart**
   - Given expenses in several months of 2026
   - Then the chart has 12 bars (Jan…Dec) with each month's total, the current month highlighted, and a
     caption "Peak: <month> · <amount>" for the highest month (earliest month wins a tie; no caption when the
     year has no expenses)
4. **Past year chart**
   - When I view a past year
   - Then the peak month is highlighted instead of the current month
5. **By category**
   - Given 2026 expenses in Fuel €1,172, Tires €380 and Other €55
   - Then the breakdown lists only these three, sorted by amount descending, each with its amount and its
     share in whole percent of the year total
6. **Lifetime tiles**
   - Given purchase price €8,500, odometer at start 171,200, current odometer 184,320 and all expenses
     (all years) €2,648
   - Then Car value is €8,500, Distance is 13,120 km and Cost per km is €0.85 ((2,648 + 8,500) ÷ 13,120)
7. **No distance yet**
   - Given current odometer equals odometer at start
   - Then Cost per km shows "—" (also on the Expenses tab tile)
8. **Empty year**
   - Given no expenses in the selected year
   - Then the tiles show 0, the chart is flat, and the breakdown shows an empty state; lifetime tiles still
     show their values
9. **Another user's vehicle**
   - When I request insights for a vehicle I don't own
   - Then the response is 404

## Edge cases

- Year switcher range is the same as on the Expenses tab (`firstYear` … current year); `year` outside
  1900 … current year → 400.
- Shares are rounded half-up to whole percent and may not add up to exactly 100 (accepted).
- Cost per km is rounded half-up to 2 decimals in the display currency.
- Expenses dated before the vehicle was added count in their year and in the lifetime total.
- "Current year / month" uses the server's current date (UTC).

## API impact

In module `expenses` (it owns the expense data; vehicle data via `vehicles::api`). No new module.

- `GET /api/vehicles/{vehicleId}/insights?year=` → `VehicleInsights` (`getVehicleInsights`); `year`
  defaults to the current year; 400, 404.

Schema `VehicleInsights { year, firstYear, total: Money, averagePerMonth: Money, monthTotals: Money[12],
categories: [{ category, total: Money, sharePercent: integer }], carValue: Money, distanceKm: integer,
costPerKm: Money (nullable) }` — all Money in the display currency.

## UI notes

- **Insights tab** (screen 03) in the vehicle's bottom tab bar (added with this spec). Header "Insights ·
  2026" with the same prev/next year switcher as Expenses.
- Tiles: Total spent (inverse), Avg per month, Car value (caption "Purchase price"), Distance. Cost per km
  is shown as the third tile on the **Expenses** tab ("Per km"), from this endpoint.
- `MonthlyBarChart` built with plain elements (no chart library), `role="img"` with an `aria-label` summary.
- States: loading skeleton, error with retry, empty year (AC 8).

## E2E

- none (covered by backend integration tests and frontend component tests)

## Out of scope

- Lifetime or custom-range totals other than cost per km; comparing years or vehicles; fuel consumption;
  estimated car value / depreciation; exporting charts.
