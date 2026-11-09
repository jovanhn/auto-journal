# Spec: Metric info

## Status

Implemented — release **v7 (metric info)**

## Goal

Explain what each stat means. Every stat tile gets a small ⓘ button that opens a popover with the formula
from the business rules. Frontend only: no change to the rules, the contract or the backend.

Depends on: specs/expenses.md, specs/insights.md (both Implemented).

## User stories

- As a user, I want to tap ⓘ next to a stat and see how it is calculated, so that I understand the number.

## Business rules

Explains BR-I1, BR-I3, BR-I4, BR-I6, BR-I7, BR-I8, BR-I9 and BR-V7; none of them change.

## Acceptance criteria

1. **Info on every stat**
   - Given the Expenses tiles (year, This month, Per km), the Insights tiles (Year and All time) and the
     Garage summary
   - Then each stat has an ⓘ button labelled "About <stat>"
2. **Open and close**
   - When I tap ⓘ
   - Then a popover shows the text from the table below; Escape, tapping outside or tapping ⓘ again closes it
3. **Lifetime per km is labelled**
   - The Expenses "Per km" tile has the caption "Incl. purchase price" (the same figure as All time)

| Stat | Text |
| ---- | ---- |
| This year / Total {year} (Expenses) | Sum of all expenses dated in {year}. |
| This month | Sum of all expenses dated in the current month. |
| Per km (Expenses, All time) | Lifetime cost per km: (all expenses + purchase price) ÷ km driven (current odometer − odometer at start). "—" until some km are driven. |
| Total spent (Year) | Sum of all expenses dated in {year}. |
| Total spent (All time) | Sum of all expenses of this vehicle. |
| Avg per month (Year) | {year} total ÷ months elapsed: 12 for a past year, January to now for this year. Months without expenses count. |
| Avg per month (All time) | Total ÷ months from the purchase date (or the first expense, if earlier) to now. |
| Distance (Year) | Highest odometer reading by the end of {year} − highest by the end of the year before, from expense readings. "—" when no expense in {year} has an odometer reading. |
| Distance (All time) | Current odometer − odometer at start. |
| Per km (Year) | {year} total ÷ distance in {year}; the purchase price is not included. "—" when the distance is unknown or 0. |
| Car value | The purchase price for now; later it will be estimated from age and market data. |
| Garage summary | Sum of all expenses of all your vehicles this year; average = that ÷ months elapsed this year. |

## Edge cases

- none

## API impact

None.

## UI notes

- ⓘ (lucide `Info`, 14 px) after the label, muted colour (inverse tiles: `inverse-muted`), tap area ≥ 44 px.
- Popover (shadcn `Popover`, from the existing `radix-ui` package): stat name as title, text below, max width
  ~280 px, design tokens only.
- No ⓘ on the charts or the category breakdown.

## E2E

- none (frontend component tests)

## Out of scope

- Explanations for charts, Peak, categories and the Planned projection.
