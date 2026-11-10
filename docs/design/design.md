# Design

The visual design of autojournal: tokens, components, screens, and how the design is iterated. Read this
before building or changing any UI.

- **Design version:** v0.0.8 (2026-11-10) — see [Changelog](#changelog)
- **Source of truth:** the Claude Design canvas **https://claude.ai/artifact/UKHaVhojYYmcVKV2PZTf1E**
  (mobile boards, 390 × 844). It is improved over time; always read the current version.
- **Snapshot:** [`screens/`](screens/) holds an old export (v0.0.1, 6 screens). It is frozen and no longer
  updated; when it disagrees with the canvas, the canvas wins.
- **Made with:** Claude Design

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

## The canvas

The canvas is private to the owner. Commit only the plain URL above, never a share link with `?sk=…` (the
repo is public and the key opens the design to anyone).

Each board is one file in the canvas: `project/canvas.json` is the index (board file → title, position) and
`project/<Board>.dc.html` holds a board's template (markup, inline styles, and a small `class Component
extends DCLogic` script with its props/state). Boards are referred to by their title or file, e.g. "Issues ·
open" (`Issues.dc.html`).

**Reading it (agents):** in Claude Code, use the Artifact tool's `read` action on the URL, first with `path:
"project/canvas.json"`, then with `paths` for the boards you need. Agents without claude.ai access ask the
owner. Agents read the canvas but never publish to it unless the owner asks.

## Files

```
docs/design/
  design.md                    this file — tokens, components, screens, open questions, changelog
  screens/                     frozen v0.0.1 snapshot (see above); never edit
    autojournal_v_0_0_1.html   old Claude Design export
    src/                       per-screen sources generated from it (`make design-unpack`)
  tools/
    unpack-bundle.mjs          extracts screens/src/ from an export
```

## Updating the design (iteration workflow)

1. Edit the design in the canvas (Claude Design). The canvas keeps its own version history.
2. Update this file in a `docs(design): …` commit: tokens/components that changed, new boards in the
   [screen inventory](#screens), resolved/new [open questions](#open-questions), and a
   [changelog](#changelog) entry (version, date, which boards changed and how). This changelog is the
   reviewable record of design changes in git.
3. Implementing the change in the frontend is a separate `feat(frontend)` commit that updates the token CSS
   variables and components, never hex values in components.

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
| `--brand` / `-foreground` | `#1F4FD8` / `#FFFFFF` | Brand mark only; same in light and dark ([Brand](#brand))      |
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

### Brand

- **Mark:** a fuel receipt (pump, two text lines, total line, torn bottom edge) drawn in
  `--brand-foreground` on a `--brand` tile with radius 14/64. `--brand` equals the default accent
  (`#1F4FD8`) but stays fixed in both themes and when the accent changes. It is an outline drawing like the
  icons. It is not part of the Claude Design export; the source of truth is
  `frontend/src/shared/ui/AppLogo.tsx`, and `frontend/public/favicon.svg` is the same drawing in fixed colors.
- **Name:** always lowercase `autojournal`, in IBM Plex (the mono eyebrow or 600 sans). The name is never
  drawn into the mark.
- **Where:** next to the `AUTOJOURNAL` eyebrow on Sign in and OAuth consent, and at 28 px next to the name in
  the app bar. Browser and home-screen icons: `favicon.svg`, `favicon-32.png` and `apple-touch-icon.png`
  (180, square: iOS rounds the corners). When the drawing changes, re-render the PNGs from the SVG.
- **Don't** use a picture of a real car model in the brand.

## Layout and navigation

```
Garage ──tap vehicle card──▶ Vehicle [ Journal | Insights | Planned | Issues ]  (bottom tab bar)
  │                              │ back ◀── app bar
  └── Add vehicle (dashed btn)   └── Journal FAB "Add" ──▶ Add to journal (Expense | Log)
```

Three screen shells:

1. **Top level (Garage):** mono eyebrow + 32 px title, no app bar, scrolling content.
2. **Vehicle section (Journal / Insights / Planned / Issues):** white app bar (44 px back button → Garage, vehicle
   nickname 20/600 + subtitle) · scrolling content · fixed 72 px bottom tab bar, 4 tabs with icon + label;
   active tab is `accent` + 600 with `aria-current="page"`.
3. **Form (Add expense / Add vehicle):** app bar with `Cancel` (muted) · centered title · `Save` (accent) ·
   scrolling fields · sticky full-width primary button at the bottom (Save expense / Add to garage).

## Components

Candidates for `src/shared/ui/` (if generic) or `src/features/<f>/components/`. Build on shadcn primitives.

| Component              | Where                   | Notes                                                                                     |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `HeroSummary`          | Garage, Planned         | Inverse card: label, 36 px value, 1–2 meta lines                                          |
| `StatTile`             | Expenses, Insights      | Label + value (+ optional caption); `default` and `inverse` variants; 2- or 3-column grid; optional ⓘ (`MetricInfo`) |
| `MetricInfo`           | Expenses, Insights, Garage | 14 px ⓘ after a stat label (44 px tap area) opening a popover: stat name + formula      |
| `VehicleCard`          | Garage                  | Whole card is a link; icon tile, nickname, make·model·year·km, value, year-to-date total; optional footer with next planned expense (warning color when due soon) |
| `PeriodSwitcher`       | Insights                | Prev/next 44 px icon buttons around the year                                              |
| `JournalFilterBar`     | Journal                 | Under the app bar on the page background, bottom border: 48 px search input (search icon, "Search") and a 148 px entry type select ("All entries"; *Entry type*: Expenses, Log entries; *Expense category*: the eight categories), accent border + `primary-subtle` tint while it narrows; then `YearChips` |
| `YearChips`            | Journal                 | "All · 2026 · 2025 …" 44 px toggle buttons (`aria-pressed`, selected = filled accent) in one row that scrolls sideways; on hover-capable devices 32 px round arrows appear on hover at the ends that can scroll |
| `ExpenseMonthGroup`    | Journal                 | Month name + month total header (no total when the month has only log entries), then a card of `ExpenseRow`s and `LogRow`s, newest first (`JournalMonthGroup` in code) |
| `ExpenseRow`           | Journal                 | Category dot, title (category · note), date · odometer (mono) or note, amount right (`≈ ` prefix when approximate) |
| `LogRow`               | Journal                 | Hollow 10 px ring (1.5 px `category-neutral` border) instead of the dot, the note as title ("Odometer reading" without one), date · odometer (mono), no amount; accessible text starts with "Log" (`LogEntryRow` in code) |
| `EntryKindToggle`      | Add to journal, Edit    | Switch row after date · odometer: card with "This is an expense" + hint "Adds amount, currency and category" and a 48×28 track (accent when on); `role="switch"`; off = Log hides amount, currency, category and Approximate |
| `MonthlyBarChart`      | Insights                | 10–12 bars, current month `accent`, others `chart-muted`; `role="img"` + `aria-label` summary; mono month initials |
| `YearlyBarChart`       | Insights (All time)     | Same look as `MonthlyBarChart`, one bar per year, current year `accent`; full years up to 6 bars, `'25` beyond |
| `PeriodToggle`         | Insights                | Two toggle buttons (`aria-pressed`) "Year" / "All time", selected = filled accent, like `CategoryPicker` |
| `CategoryBreakdown`    | Insights                | Per category: label, `%` (muted) · amount, 8 px progress bar                              |
| `PlannedExpenseCard`   | Planned                 | Title, date · recurrence, amount; status pill; "Mark as paid" (accent outline when due soon, neutral otherwise) |
| `StatusPill`           | Planned                 | `warning` ("Due in 24 days") and `neutral` ("In 4 months")                                |
| `DashedAddButton`      | Garage, Planned         | 52 px, dashed border, plus icon                                                           |
| `CategoryPicker`       | Add expense             | 2-column grid of toggle buttons (`aria-pressed`), selected = filled accent                |
| Approximate checkbox   | Add expense             | shadcn `Checkbox` + label "Approximate" + hint "Amount or date is a best guess", below date · odometer |
| `AmountInput`          | Add expense             | Centered, `€` prefix, 44 px tabular, `inputmode="decimal"`                                 |
| Form field             | Add expense/vehicle     | shadcn `Field`: label 13/600 muted above a 48 px input; optional helper text 12 px muted; "(optional)" in the label |
| `Fab`                  | Journal, Issues         | Pill, icon + label ("Add journal entry", "Add issue"), bottom-right above the tab bar                    |
| `IssueRow`             | Issues                  | Open: 10 px severity marker (Urgent `warning` dot, Fix soon `foreground` dot, Watch hollow ring), title, "source · date · odometer" (12 px muted), `SeverityPill`. Resolved (`ResolvedIssueRow`): muted, check (Fixed) or minus-circle (Gone) icon, title, "Fixed · Oct 21, 2026" |
| `SeverityPill`         | Issues                  | Urgent = `warning-subtle` / `warning`, Fix soon = `divider` filled, Watch = outline (`input` border on card) |
| Resolved section       | Issues                  | "Resolved · N" 44 px toggle button with chevron (`aria-expanded`), collapsed by default; expands a card of resolved rows |
| `ChipSelector`         | New/Edit issue, Resolve | Equal-width 44 px toggle buttons (`aria-pressed`), selected = filled accent; 3 per row (2 for outcome) |
| Resolve sheet          | Edit issue              | shadcn `Sheet` from the bottom: title "Resolve issue", the issue title, Outcome chips, Date resolved, button "Resolve"; opened by the outline accent "Resolve issue" button |

## Screens

Boards of the canvas (file under `project/`). Behavior on a board that no spec has is not a requirement.

| Board (title)                      | File                               | Shows                                                                         |
| ---------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Garage                             | `Main.dc.html`                     | All-cars year-to-date hero (total, vehicle count, avg/month); vehicle cards; Add vehicle |
| Vehicle · Journal                  | `Expenses.dc.html`                 | Filter bar, year chips, tiles Spent · Avg / month · Entries, entries grouped by month, FAB |
| Journal · scrolling year chips     | `ExpensesScrollChips.dc.html`      | Year chips overflowing horizontally                                           |
| Journal · desktop hover state      | `ExpensesScrollChipsHover.dc.html` | Hover states on wider screens                                                 |
| Vehicle · Insights                 | `Insights.dc.html`                 | Tiles, by-month chart, by-category breakdown (Year / All time per specs/insights.md) |
| Vehicle · Planned                  | `Planned.dc.html`                  | 12-month projection hero; upcoming planned items with Mark as paid; Plan an expense |
| Add journal entry · expense        | `AddExpense.dc.html`               | Expense form: amount, category, date, odometer, note, approximate, Expense \| Log switch |
| Add journal entry · not an expense | `AddJournalEntry.dc.html`          | Log form: date, odometer, note                                                |
| Add vehicle                        | `AddVehicle.dc.html`               | Nickname, make, model, year, plate (optional), odometer, purchase price + date |
| Issues · open                      | `Issues.dc.html`                   | Open issues by severity, collapsed Resolved section, Add issue FAB, 4th tab Issues (specs/issues.md) |
| Issues · resolved expanded         | `IssuesResolved.dc.html`           | Resolved section expanded                                                     |
| Issues · empty                     | `IssuesEmpty.dc.html`              | No issues at all                                                              |
| Issues · only resolved             | `IssuesAllResolved.dc.html`        | No open issues, resolved ones collapsed                                       |
| New issue                          | `NewIssue.dc.html`                 | Title, severity, source, date noticed, odometer, note (its estimated cost is dropped) |
| Edit issue                         | `EditIssue.dc.html`                | Same form + Resolve issue, Delete issue                                       |
| Resolve issue (sheet)              | `ResolveIssue.dc.html`             | Outcome, date resolved; Expense None \| Link existing \| Add new (v11, specs/issue-expenses.md) |
| Resolved issue                     | `ResolvedIssue.dc.html`            | Outcome pill, details, linked expense (v11), Reopen issue                     |

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
| v0.0.2  | 2026-11-07 | Brand mark (fuel receipt) for favicon, app icon, Sign in, OAuth consent and the app bar. Export unchanged. |
| v0.0.3  | 2026-11-08 | Insights: Year / All time `PeriodToggle`, `YearlyBarChart`, year distance and per km tiles. Export unchanged. |
| v0.0.4  | 2026-11-08 | Approximate expenses: "Approximate" checkbox on the expense form, `≈` on `ExpenseRow`. Export unchanged. |
| v0.0.5  | 2026-11-09 | Metric info: ⓘ popover on every stat tile and the Garage summary; Expenses Per km caption "Incl. purchase price". Export unchanged. |
| v0.0.6  | 2026-11-10 | Journal: vehicle tab "Expenses" → "Journal", FAB "Add", `LogRow`, `EntryKindToggle` (Expense \| Log) on Add to journal / Edit expense / Edit log. Screen 02 still shows "Expenses" in the export. Export unchanged. |
| v0.0.7  | 2026-11-10 | Journal filters (Claude Design canvas "autojournal", boards *Vehicle · Journal*, *Journal · scrolling year chips*, *Journal · desktop hover state*, *Add journal entry*): `JournalFilterBar`, `YearChips` replace `PeriodSwitcher` on the Journal; tiles Spent · Avg / month · Entries; month headers muted (with the year under All); ring `LogRow`; FAB "Add journal entry"; `EntryKindToggle` as a switch row after date · odometer. Not in the export yet (still screen 02). |
| v0.0.9  | 2026-11-10 | Issues implemented (specs/issues.md): 4th vehicle tab **Issues** (warning-triangle icon), `IssueRow`, `SeverityPill`, Resolved section, `ChipSelector`, Resolve sheet, Resolved issue screen; FAB "Add issue". The New issue mock's estimated cost and the Resolve sheet's Expense control are not built (v11). |
| v0.0.8  | 2026-11-10 | The Claude Design canvas becomes the source of truth; the `screens/` export is a frozen v0.0.1 snapshot. Issues boards added (*Issues · open*, *· resolved expanded*, *· empty*, *· only resolved*, *New issue*, *Edit issue*, *Resolve issue (sheet)*, *Resolved issue*) for specs/issues.md and specs/issue-expenses.md; components are added here when implemented. |
