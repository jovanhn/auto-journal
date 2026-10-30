# Design

The visual design of autojournal: tokens, components, screens, and how the design is iterated. Read this
before building or changing any UI.

- **Design version:** v0.0.1 (2026-10-24) — see [Changelog](#changelog)
- **Reference screens:** [`screens/`](screens/) (6 mobile screens, 390 × 844)
- **Made with:** Claude Design, exported as standalone HTML

## Scope and authority

- The design decides **how things look and where they are** (layout, navigation, styling, copy tone).
  It does not decide behavior: `docs/domain` → `docs/specs` → `contracts/openapi.yaml` still win. If a screen
  shows a field, rule, or calculation the domain/specs don't have, **stop and ask** — don't implement it from
  the mock.
- Sample data in the screens (Golf, Octavia, amounts, dates) is illustrative only.
- The screens use inline styles and hard-coded hex values. **Never copy them into code.** Translate to the
  tokens below (CSS variables in `frontend/src/index.css`) and Tailwind classes, using shadcn primitives
  from `src/shared/ui/` (see [frontend/AGENTS.md](../../frontend/AGENTS.md), ADR 0011).
- Mobile-first: design for 390 px width first; wider layouts are an [open question](#open-questions).

## Files

```
docs/design/
  design.md                    this file — tokens, components, screens, open questions, changelog
  screens/
    autojournal_v_0_0_1.html   Claude Design export (open in a browser to view); never edit by hand
    src/                       readable per-screen sources, generated from the export — never edit
      01-garage.html … 06-add-vehicle.html
  tools/
    unpack-bundle.mjs          extracts screens/src/ from the export (`make design-unpack`)
```

The export is a single self-unpacking file (~600 KB, minified runtime + gzipped pages), useless in a diff.
`screens/src/` holds each screen's template (markup, inline styles, and the small `class Component extends
DCLogic` script with its props/state) so design changes are reviewable in `git diff` and readable by agents.
The `src/` files need the Claude Design runtime to render — to *look* at the screens, open the export.

## Updating the design (iteration workflow)

1. Edit the design in Claude Design (start from the current export or the `screens/src/` sources).
2. Export as standalone HTML and replace the file in `screens/` (keep exactly one export there; name it
   `autojournal_v_<major>_<minor>_<patch>.html`; git keeps old versions).
3. Run `make design-unpack` and review `git diff docs/design/screens/src/` — that diff *is* the design change.
4. Update this file in the same commit: tokens/components that changed, new screens in the
   [screen inventory](#screens), resolved/new [open questions](#open-questions), and a
   [changelog](#changelog) entry (version, date, what changed).
5. Commit as `docs(design): …`. Implementing the change in the frontend is a separate `feat(frontend)` commit
   that updates the token CSS variables and components, never hex values in components.

If a design change implies new behavior (new field, new calculation), update `docs/domain` / `docs/specs`
first — the design alone is not a requirement.

## Tokens

The design exposes one adjustable prop, `accent` (default `#1F4FD8`; alternatives offered: `#0F766E` teal,
`#B4490F` orange, `#16181D` ink). Everything accent-colored below follows it.

### Color

| Token (proposed CSS var) | Value     | Used for                                                                |
| ------------------------ | --------- | ----------------------------------------------------------------------- |
| `--background`           | `#F4F4F2` | Screen background                                                       |
| `--foreground`           | `#16181D` | Primary text, icons                                                     |
| `--card`                 | `#FFFFFF` | Cards, stat tiles, app bar, tab bar, inputs                             |
| `--muted-foreground`     | `#5B606B` | Secondary text, labels, inactive tabs, subtitles                        |
| `--border`               | `#E2E3E0` | Card borders, app-bar/tab-bar dividers, chart baseline                  |
| `--divider`              | `#EDEEEB` | Row dividers inside cards; progress track; neutral pill background      |
| `--input`                | `#D4D6D1` | Input borders, secondary button border, unselected chips                |
| `--border-dashed`        | `#B8BBB5` | Dashed "Add vehicle" / "Plan an expense" buttons                        |
| `--primary` (= `accent`) | `#1F4FD8` | Primary buttons, FAB, active tab, Save link, selected chip, chart focus |
| `--primary-foreground`   | `#FFFFFF` | Text on primary                                                         |
| `--primary-subtle`       | `#E7ECFB` | Vehicle icon tile background                                            |
| `--chart-muted`          | `#C9D4F4` | Non-highlighted bars in the monthly chart                               |
| `--inverse`              | `#16181D` | Hero summary cards (dark), "Total spent" tile                           |
| `--inverse-foreground`   | `#FFFFFF` | Main value on inverse cards                                             |
| `--inverse-muted`        | `#C9CCD3` | Labels on inverse cards (`#A9ADB6` for footnotes)                       |
| `--warning`              | `#A3400D` | "Due soon" text (garage reminder, due pill)                             |
| `--warning-subtle`       | `#FBEDE4` | "Due soon" pill background                                              |

Naming note: the design's `accent` maps to shadcn's **`--primary`**. shadcn's own `--accent` is a hover/selected
surface color, not the brand color — don't mix them up.

Category colors (dot in expense rows): Fuel = `accent`, Service = `#16181D`, Tires = `#B4490F`,
Parking & tolls = `#8A8F99`. The other categories have no color yet ([open question](#open-questions)).
Breakdown bars on Insights all use `accent`.

### Typography

- **Sans:** IBM Plex Sans 400 / 500 / 600 — all UI text.
- **Mono:** IBM Plex Mono 500 — the `AUTOJOURNAL` eyebrow, odometer readings, plates, chart axis labels.
- **Numbers:** every amount, total, and distance uses `font-variant-numeric: tabular-nums` (`tabular-nums`).

| Role                         | Size / weight         | Example                                 |
| ---------------------------- | --------------------- | --------------------------------------- |
| Amount input                 | 44 / 600              | Add expense amount                      |
| Hero value                   | 36 / 600              | `€3,760`, `≈ €2,730`                    |
| Screen title (top level)     | 32 / 600, −0.01em     | Garage                                  |
| Tile value (large)           | 24 / 600              | Insights tiles                          |
| App-bar title                | 20 / 600              | Vehicle name                            |
| Tile value (small)           | 18 / 600              | Expenses stat tiles                     |
| Card title / form title      | 17 / 600              | Vehicle card name, "New expense"        |
| Item title                   | 15–16 / 500–600       | Expense row, planned item, card heading |
| Body / labels / subtitles    | 13–14 / 400–600       | Field labels 13/600 muted               |
| Meta / captions / tab labels | 12 / 400–600          | Row date line, tab bar                  |
| Eyebrow                      | Mono 12, uppercase, 0.08em | `AUTOJOURNAL`                      |

### Shape, spacing, elevation

- **Radius:** 16 cards & hero · 14 primary CTA · 12 inputs, stat tiles, icon tile · 10 buttons & chips ·
  4 chart bars / progress · full (pill) for status pills and the FAB.
- **Spacing:** screen gutter 20 · card padding 16 (hero 20, tiles 12–14) · stack gaps 16 between blocks,
  8 within groups, 12–14 inside cards · list rows 14 × 16.
- **Touch targets:** ≥ 44 px for every tappable element; inputs 48 px; primary CTA and FAB 52 px.
- **Elevation:** flat — 1 px borders, no shadows, except the FAB (`0 4px 14px rgba(22,24,29,.18)`).
- **Icons:** 24 px outline, stroke 1.8–2, round caps (matches `lucide-react`); 16–18 px inline.

## Layout and navigation

```
Garage ──tap vehicle card──▶ Vehicle [ Expenses | Insights | Planned ]  (bottom tab bar)
  │                              │ back ◀── app bar
  └── Add vehicle (dashed btn)   └── Expenses FAB ──▶ Add expense
```

Three screen shells:

1. **Top level (Garage):** mono eyebrow + 32 px title, no app bar, scrolling content.
2. **Vehicle section (Expenses / Insights / Planned):** white app bar (44 px back button → Garage, vehicle
   nickname 20/600 + subtitle) · scrolling content · fixed 72 px bottom tab bar, 3 tabs with icon + label;
   active tab is `accent` + 600 with `aria-current="page"`.
3. **Form (Add expense / Add vehicle):** app bar with `Cancel` (muted) · centered title · `Save` (accent) ·
   scrolling fields · sticky full-width primary button at the bottom (Save expense / Add to garage).

## Components

Candidates for `src/shared/ui/` (if generic) or `src/features/<f>/components/`. Build on shadcn primitives.

| Component              | Where                   | Notes                                                                                     |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `HeroSummary`          | Garage, Planned         | Inverse card: label, 36 px value, 1–2 meta lines                                          |
| `StatTile`             | Expenses, Insights      | Label + value (+ optional caption); `default` and `inverse` variants; 2- or 3-column grid |
| `VehicleCard`          | Garage                  | Whole card is a link; icon tile, nickname, make·model·year·km, value, year-to-date total; optional footer with next planned expense (warning color when due soon) |
| `PeriodSwitcher`       | Expenses                | Prev/next 44 px icon buttons around "2026 · All categories"                               |
| `ExpenseMonthGroup`    | Expenses                | Month name + month total header, then a card of `ExpenseRow`s                             |
| `ExpenseRow`           | Expenses                | Category dot, title (category · note), date · odometer (mono) or note, amount right       |
| `MonthlyBarChart`      | Insights                | 10–12 bars, current month `accent`, others `chart-muted`; `role="img"` + `aria-label` summary; mono month initials |
| `CategoryBreakdown`    | Insights                | Per category: label, `%` (muted) · amount, 8 px progress bar                              |
| `PlannedExpenseCard`   | Planned                 | Title, date · recurrence, amount; status pill; "Mark as paid" (accent outline when due soon, neutral otherwise) |
| `StatusPill`           | Planned                 | `warning` ("Due in 24 days") and `neutral` ("In 4 months")                                |
| `DashedAddButton`      | Garage, Planned         | 52 px, dashed border, plus icon                                                           |
| `CategoryPicker`       | Add expense             | 2-column grid of toggle buttons (`aria-pressed`), selected = filled accent                |
| `AmountInput`          | Add expense             | Centered, `€` prefix, 44 px tabular, `inputmode="decimal"`                                 |
| Form field             | Add expense/vehicle     | shadcn `Field`: label 13/600 muted above a 48 px input; optional helper text 12 px muted; "(optional)" in the label |
| `Fab`                  | Expenses                | Pill, icon + label, bottom-right above the tab bar                                         |

## Screens

| #   | Screen             | Source                                                        | Shows                                                                                           |
| --- | ------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Garage             | [01-garage.html](screens/src/01-garage.html)                  | All-cars year-to-date hero (total, vehicle count, avg/month); vehicle cards; Add vehicle        |
| 2   | Vehicle · Expenses | [02-vehicle-expenses.html](screens/src/02-vehicle-expenses.html) | Tiles: this year, this month, per km; period switcher; expenses grouped by month; Add expense FAB |
| 3   | Vehicle · Insights | [03-vehicle-insights.html](screens/src/03-vehicle-insights.html) | Tiles: total spent, avg/month, car value ("Purchase price"), distance; by-month chart; by-category breakdown |
| 4   | Vehicle · Planned  | [04-vehicle-planned.html](screens/src/04-vehicle-planned.html)  | 12-month projection hero (planned + running costs); upcoming planned items with Mark as paid; Plan an expense |
| 5   | Add expense        | [05-add-expense.html](screens/src/05-add-expense.html)        | Amount, vehicle, category (8 fixed), date, odometer, note                                       |
| 6   | Add vehicle        | [06-add-vehicle.html](screens/src/06-add-vehicle.html)        | Nickname, make, model, year, plate (optional), current odometer, purchase price + date          |

Copy conventions seen in the screens: euro prefix with thousands comma (`€2,148`, cents only in lists:
`€52.40`), `km` suffix, short dates (`Oct 18`, `Nov 14, 2026`), sentence case, `≈`/`~` for estimates.

## Open questions

Gaps in v0.0.1 to resolve in a design iteration (or with the product owner for behavior) before implementing
the affected part:

- **Not designed:** loading, empty (no vehicles / no expenses / nothing planned) and error states — required
  for every page (frontend Definition of Done).
- **Not designed:** dark theme (ADR 0011 requires light + dark), the "Plan an expense" form, the "Mark as paid"
  flow, editing/deleting a vehicle or expense, validation/error states in forms.
- **Not designed:** Sign in and Settings (display currency, sign out) screens (specs/auth.md); currency
  select on amount fields (ADR 0014). Built from existing tokens/components until designed.
- **Wider screens:** mobile-first, but nothing defines tablet/desktop (centered 390–480 px column?).
- **Category colors** for Repairs, Insurance, Registration & tax, Other (until designed they use the
  Parking & tolls grey, token `--category-neutral`).
- **Fonts:** IBM Plex Sans/Mono replace the system font stack chosen in ADR 0011 and require either a
  Google Fonts link or a font package — needs an ADR before adopting.
- **Behavior shown by the mocks, now decided in domain/specs** (the mocks differ; specs win): "due soon" =
  within 30 days or overdue (BR-PL6); cost per km is lifetime incl. purchase price (BR-I4); the projection
  has **no** running costs (BR-I5); Garage and Insights "avg / month" = year total ÷ months elapsed
  (BR-I3, BR-I6); the Expenses period switcher is year only, no category filter; Add expense has no vehicle
  picker; Expenses tiles are This year, This month and (from v2) Per km.

## Changelog

| Version | Date       | Change                                                                                         |
| ------- | ---------- | ---------------------------------------------------------------------------------------------- |
| v0.0.1  | 2026-10-24 | Initial design: Garage, Vehicle (Expenses, Insights, Planned), Add expense, Add vehicle.       |
