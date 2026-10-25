# Glossary

## autojournal

| Term                   | Meaning                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **User**               | A person signed in through Supabase Auth. Owns vehicles; sees only their own data.                   |
| **User preferences**   | Per-user app settings stored by autojournal. For now only the display currency.                      |
| **Vehicle**            | A car owned by exactly one user: nickname, make, model, year, optional plate, odometer at purchase, purchase price and date. |
| **Garage**             | The list of the user's vehicles (home screen).                                                       |
| **Expense**            | A real, paid cost of a vehicle: date, amount, currency, category, optional odometer and note.        |
| **Category**           | Fixed classification of an expense or planned expense: Fuel, Service, Repairs, Insurance, Registration & tax, Tires, Parking & tolls, Other. |
| **Planned expense**    | An expected future cost of a vehicle: category, estimated amount, currency, due date, recurrence, optional note. No title. |
| **Recurrence**         | How often a planned expense repeats: *one-time*, or *every N months* (N ≥ 1; 12 = yearly).           |
| **Mark as paid**       | Turn a planned expense into a real expense (pre-filled, editable). One-time items are then done; recurring items move their due date forward by N months. |
| **Projection**         | Expected cost per month for the next 12 months, computed from planned expenses only.                 |
| **Currency**           | One of `EUR`, `RSD`, `USD`. Every amount (expense, purchase price, planned expense) has its own currency. |
| **Display currency**   | The currency a user sees totals in and the default currency for new amounts. Per user; default `EUR`. |
| **Exchange rate**      | Fixed conversion rate between currencies, set in application configuration (not by users).           |
| **Rate snapshot**      | The exchange rate stored with an expense (and a vehicle's purchase price) when it is saved, so past totals don't change when rates change. |
| **Odometer at purchase** | The vehicle's odometer reading when the user got it; starting point for distance driven.           |
| **Current odometer**   | Derived: the highest of the odometer at purchase and all of the vehicle's expense odometer readings. Never entered directly. |
| **Distance driven**    | Current odometer − odometer at purchase.                                                             |
| **Car value**          | For now equal to the purchase price. Later estimated from age and market data.                       |
| **Cost per km**        | (Total expenses + purchase price) ÷ distance driven, in the display currency.                        |
| **Average monthly cost** | Total expenses ÷ number of months since the vehicle was added to the app, including months without expenses. |

## Example scaffold (removed when the `vehicles` module exists)

| Term             | Meaning                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Project**      | A named container for tasks. Names are unique, case-insensitive.                         |
| **Task**         | A unit of work that belongs to exactly one project. Has a title and a status (`OPEN`/`DONE`). |
| **Project summary** | A project together with its open- and done-task counts, as shown in the projects list. |

The planned project/task features (`specs/close-task.md`, `specs/subtasks.md`) will not be built.
