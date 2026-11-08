# Glossary

## autojournal

| Term                   | Meaning                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **User**               | A person signed in through Supabase Auth. Owns vehicles; sees only their own data.                   |
| **User preferences**   | Per-user app settings stored by autojournal. For now only the display currency.                      |
| **Vehicle**            | A car owned by exactly one user: nickname, make, model, year, optional plate, odometer at start, purchase price and date. |
| **Garage**             | The list of the user's vehicles (home screen).                                                       |
| **Expense**            | A real, paid cost of a vehicle: date, amount, currency, category, optional odometer and note.        |
| **Approximate expense** | An expense whose amount, date or both are a best guess. Marked with `≈` in the list; counts like any other expense in totals. |
| **Category**           | Fixed classification of an expense or planned expense: Fuel, Service, Repairs, Insurance, Registration & tax, Tires, Parking & tolls, Other. |
| **Planned expense**    | An expected future cost of a vehicle: category, estimated amount, currency, due date, recurrence, optional note. No title. |
| **Recurrence**         | How often a planned expense repeats: *one-time*, or *every N months* (N ≥ 1; 12 = yearly).           |
| **Mark as paid**       | Turn a planned expense into a real expense (pre-filled, editable). One-time items are then done; recurring items move their due date forward by N months. |
| **Projection**         | Expected cost per month for the next 12 months, computed from planned expenses only.                 |
| **Currency**           | One of `EUR`, `RSD`, `USD`. Every amount (expense, purchase price, planned expense) has its own currency. |
| **Display currency**   | The currency a user sees totals in and the default currency for new amounts. Per user; default `EUR`. |
| **Exchange rate**      | Fixed conversion rate between currencies, set in application configuration (not by users).           |
| **Rate snapshot**      | The exchange rate stored with an expense (and a vehicle's purchase price) when it is saved, so past totals don't change when rates change. |
| **Odometer at start**  | The vehicle's odometer reading when it was added to the app; starting point for distance driven.     |
| **Current odometer**   | Derived: the highest of the odometer at start and all of the vehicle's expense odometer readings. Never entered directly. |
| **Distance driven**    | Current odometer − odometer at start (distance since the vehicle was added).                         |
| **Distance in a year** | Odometer at the end of the year − odometer at the end of the previous year, from the readings logged up to then; unknown when the year has no reading. |
| **All time**           | The Insights period covering all of a vehicle's expenses, from its first expense (or purchase) to today. |
| **Car value**          | For now equal to the purchase price. Later estimated from age and market data.                       |
| **Cost per km**        | (Total expenses + purchase price) ÷ distance driven, over the vehicle's whole history, in the display currency. |
| **Average monthly cost** | A year's total expenses ÷ months elapsed in that year (12 for a past year, through the current month for this year), including months without expenses. |
| **Due soon**           | A planned expense due within the next 30 days, or already overdue.                                   |
| **Assistant**          | An AI client (e.g. Claude) connected over MCP that the user authorized to read and change their data on their behalf. |
