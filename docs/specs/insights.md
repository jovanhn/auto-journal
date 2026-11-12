# Spec: Insights

## Status

Implemented — release **v2** (all-time mode, yearly distance and yearly cost per km added 2026-11-08)

E2E: none (covered by `InsightsApiIntegrationTest` and `InsightsPage.test.tsx`).

## Goal

Show a user where a car's money goes — in one year (total, average per month, month by month, by category,
distance and cost per km in that year) or over all time (total, average per month, year by year, by category,
car value, distance and cost per km over the car's whole history). Read-only; no new data is entered.

Depends on: specs/vehicles.md, specs/expenses.md.

## User stories

- As a user, I want to see a car's spending per month for a year, so that I spot expensive months.
- As a user, I want to see spending by category, so that I know what costs the most.
- As a user, I want to see the average monthly cost, so that I can budget.
- As a user, I want to see the cost per km, so that I know what driving this car really costs.
- As a user, I want to switch between one year and all time, so that I see both a year and the whole history.
- As a user, I want to see how far I drove in a year and what each km cost that year, so that I can compare years.

## Business rules

- BR-U2: Only the vehicle's owner sees its insights; otherwise 404.
- BR-C6: All figures are in the display currency; expenses and purchase price use their rate snapshots.
- BR-I1: Yearly and monthly totals = sum of expenses dated in that year / month.
- BR-I2: Category breakdown = sum per category for the selected year, with its share of the total.
- BR-I3: Average monthly cost = the year's total ÷ months elapsed in that year (12 for a past year, January
  through the current month for the current year).
- BR-I4: Cost per km (lifetime) = (all expenses + purchase price) ÷ distance driven; not shown when distance
  driven is 0.
- BR-I7: Distance in a year = odometer at the end of that year − odometer at the end of the previous year,
  where the odometer at the end of a year = the highest of the odometer at start and all expense odometer
  readings dated on or before 31 December of that year. Unknown (null, UI "—") when no expense in the year
  has an odometer reading. Yearly distances add up to the lifetime distance.
- BR-I8: Cost per km in a year = the year's total ÷ distance in that year (no purchase price); not shown when
  that distance is unknown or 0.
- BR-I9: All-time figures: total = all expenses; categories = sum per category over all expenses; year
  totals = one total per calendar year from `firstYear` to the current year; average monthly cost = total ÷
  months from the month of the earlier of the purchase date and the first expense, through the current month
  (both inclusive).
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
   - When I request insights (year or all time) for a vehicle I don't own
   - Then the response is 404
10. **Distance in a year**
    - Given odometer at start 171,200 and expense readings 175,000 (2025-06), 178,000 (2025-12) and 184,320
      (2026-10)
    - Then distance in 2025 is 6,800 km and in 2026 is 6,320 km
11. **Year without readings**
    - Given no expense in the selected year has an odometer reading
    - Then the Distance and Per km tiles show "—"
12. **Cost per km in a year**
    - Given 2026 expenses totalling €2,148 and 6,320 km driven in 2026
    - Then Per km for 2026 is €0.34 (2,148 ÷ 6,320)
13. **All time**
    - Given purchase date 2025-03-10, expenses €1,200 in 2025 and €2,148 in 2026, and it is October 2026
    - When I switch to All time
    - Then Total spent is €3,348, Avg per month is €167.40 (÷ 20 months, March 2025 … October 2026), the
      chart has one bar per year (2025, 2026) with the current year highlighted, the breakdown covers all
      expenses, and Car value, Distance and Per km are the lifetime figures (AC 6)
14. **All time before the purchase**
    - Given the first expense is dated before the purchase date
    - Then the all-time average counts months from the first expense's month

## Edge cases

- Year switcher range is the same as on the Expenses tab (`firstYear` … current year); `year` outside
  1900 … current year → 400.
- Shares are rounded half-up to whole percent and may not add up to exactly 100 (accepted).
- Cost per km is rounded half-up to 2 decimals in the display currency.
- Expenses dated before the vehicle was added count in their year and in the lifetime total.
- "Current year / month" uses the server's current date (UTC).
- A year with readings that are all at or below the previous year's end odometer has distance 0 km; its cost
  per km is "—".
- Distance driven after the last reading of a year counts in the year of the next reading.

## API impact

In module `expenses` (it owns the expense data; vehicle data via `vehicles::api`). No new module.

- `GET /api/vehicles/{vehicleId}/insights?year=` → `VehicleInsights` (`getVehicleInsights`); `year`
  defaults to the current year; 400, 404.
- `GET /api/vehicles/{vehicleId}/insights/all-time` → `VehicleAllTimeInsights`
  (`getVehicleAllTimeInsights`); 404.

Schema `VehicleInsights { year, firstYear, total: Money, averagePerMonth: Money, monthTotals: Money[12],
categories: [{ category, total: Money, sharePercent: integer }], carValue: Money, distanceKm: integer,
costPerKm: Money (nullable), yearDistanceKm: integer (nullable), yearCostPerKm: Money (nullable) }` —
`distanceKm` and `costPerKm` stay lifetime (used by the Expenses tab); the two `year…` fields are additive.

Schema `VehicleAllTimeInsights { firstYear, total: Money, averagePerMonth: Money, yearTotals: [{ year,
total: Money }], categories, carValue: Money, distanceKm: integer, costPerKm: Money (nullable) }`.

All Money in the display currency.

## UI notes

- **Insights tab** (screen 03) in the vehicle's bottom tab bar (added with this spec). A two-option toggle
  **Year | All time** (toggle buttons with `aria-pressed`) above the period; URL `?period=all` for All time.
- **Year:** header "Insights · 2026" with the same prev/next year switcher as Expenses. Tiles: Total spent
  (inverse), Avg per month, Distance (that year), Per km (that year). By-month chart, by-category breakdown.
- **All time:** header "Insights · All time", no year switcher. Tiles: Total spent (inverse), Avg per month,
  Car value (caption "Purchase price"), Distance, Per km (caption "Incl. purchase price"). By-year chart
  (one bar per year, current year highlighted, caption "Peak: <year> · <amount>"), by-category breakdown.
- Lifetime cost per km is also shown as the third tile on the **Expenses** tab ("Per km").
- Bar charts built with plain elements (no chart library), `role="img"` with an `aria-label` summary.
- States: loading skeleton, error with retry, empty year (AC 8) / no expenses at all.

## E2E

- none (covered by backend integration tests and frontend component tests)

## Out of scope

- Custom date ranges; comparing years or vehicles side by side; fuel consumption; estimated car value /
  depreciation; exporting charts; interpolating distance between readings.
