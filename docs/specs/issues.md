# Spec: Issues

## Status

Implemented — release **v10 (issues)**

## Goal

Let a user keep track of what is wrong with a vehicle (a warning light, a noise, something the mechanic said
to keep an eye on) until it is fixed or goes away, in a separate **Issues** tab next to the journal. Issues
never change money, insights or the odometer. Linking an issue to the expense that fixed it comes in v11
(specs/issue-expenses.md).

Depends on: specs/vehicles.md, specs/journal.md, specs/data-limits.md, specs/assistant-mcp.md (all
Implemented). Architecture: ADR 0021.

## User stories

- As a user, I want to note an issue with how serious it is, so that I don't forget it and know what to fix
  first.
- As a user, I want to note where an issue came from (I noticed it, the mechanic said it, a warning light),
  so that I can tell the mechanic.
- As a user, I want to see open issues sorted by how serious they are, so that the urgent ones stand out.
- As a user, I want to resolve an issue as fixed or as gone by itself, so that the open list stays current
  and I keep the history.
- As a user, I want to reopen an issue that came back, so that I don't have to enter it again.
- As a user, I want Claude to read and update my issues, like my expenses.

## Business rules

New rules are in [docs/domain/business-rules.md](../domain/business-rules.md) (marked **Planned**, v10).

- BR-IS1 (new): fields of an issue: title, severity, source, date noticed, optional odometer and note.
- BR-IS2 (new): an issue never counts in totals, insights, the current odometer or distance.
- BR-IS3 (new): an issue is open or resolved; resolving records an outcome and a resolved date.
- BR-IS4 (new): a resolved issue can be reopened.
- BR-IS5 (new): an issue can be edited and deleted in either status.
- BR-IS6 (new): list order.
- BR-L8 (new): at most *issues per vehicle* issues (default 200).
- BR-U2, BR-V6 (changed), BR-A1…A4 apply to issues.

## Acceptance criteria

1. **Add an issue**
   - Given my vehicle "Golf"
   - When I add an issue "Brake pads at ~30%", severity Fix soon, source Mechanic, noticed 2026-10-12,
     odometer 184,200, note "Replace within ~5,000 km"
   - Then it is created (201) as open, and the Issues tab lists it under "Open · 1" as "Brake pads at ~30%",
     "Mechanic · Oct 12 · 184,200 km" with a "Fix soon" pill
2. **Required fields and limits**
   - When I submit without title (or a blank one), severity, source or date noticed, a title over 60
     characters, a note over 500, a date noticed in the future or before *earliest date*, or an odometer below 0
     or above *max odometer*
   - Then the response is 400 with a field error per invalid field, and nothing is saved
3. **Open list order**
   - Given open issues: Watch noticed 2026-05-20, Urgent noticed 2026-10-18, Fix soon noticed 2026-10-12,
     Fix soon noticed 2026-09-01
   - Then they are listed as Urgent (Oct 18), Fix soon (Oct 12), Fix soon (Sep 1), Watch (May 20)
4. **Issues change nothing else**
   - Given the Golf's current odometer is 184,320
   - When I add an issue with odometer 190,000
   - Then the current odometer, the journal, the totals and Insights are unchanged
5. **Resolve as fixed**
   - Given the open issue "Brake pads at ~30%" noticed 2026-10-12
   - When I resolve it with outcome Fixed on 2026-10-21
   - Then it is resolved (200), leaves the open list, and the Resolved section (collapsed by default, header
     "Resolved · 1") lists it as "Brake pads at ~30%", "Fixed · Oct 21, 2026"
6. **Resolve as gone**
   - When I resolve an issue with outcome Gone
   - Then it is listed under Resolved as "Gone · <date>"
7. **Resolve rules**
   - When the resolved date is in the future or before the date noticed, or the outcome is missing
   - Then the response is 400 with the field error (`resolvedOn` / `outcome`), and the issue stays open
   - When I resolve an issue that is already resolved
   - Then the response is 409 and the issue is unchanged
8. **Reopen**
   - Given a resolved issue
   - When I reopen it
   - Then it is open again with no outcome or resolved date and keeps its title, severity, source, date
     noticed, odometer and note
   - When I reopen an issue that is already open, the response is 409
9. **Edit and delete**
   - When I change an issue's severity and note, the change is saved and the open list re-sorts
   - When I change the date noticed of a resolved issue to after its resolved date, the response is 400
     (field `noticedOn`)
   - When I delete an issue (after confirming), it is gone; nothing else changes
10. **Resolved order**
    - Given issues resolved on 2025-01-09, 2025-08-02 and 2025-03-14
    - Then the Resolved section lists them Aug 2, Mar 14, Jan 9 (newest resolved first)
11. **Empty states**
    - Given no issues: the tab shows "No open issues" with "Note a warning light, a noise or something your
      mechanic said to keep an eye on." and the Add issue button
    - Given only resolved issues: the tab shows "No open issues", "Nothing to keep an eye on right now." and
      the collapsed Resolved section
12. **Limit**
    - Given *issues per vehicle* = 2 and a vehicle with one open and one resolved issue
    - When I add another issue
    - Then it is rejected (409) as in BR-L8; editing, resolving, reopening and deleting still work (BR-L4)
13. **Deleting a vehicle**
    - When I delete a vehicle, its issues are deleted too
14. **Ownership**
    - When I list, read, add, change, resolve, reopen or delete issues of another user's vehicle
    - Then the response is 404 and nothing changes (BR-U2)
15. **Assistant**
    - When Claude calls `list_issues`, `create_issue`, `update_issue`, `delete_issue`, `resolve_issue` or
      `reopen_issue`
    - Then the result is the same as through the API (BR-A1); `delete_issue` is marked destructive (BR-A4)

## Edge cases

- Title and note are trimmed; a blank note is stored as null, a blank title is rejected.
- The date noticed may be before the purchase date. The odometer may be lower or higher than the current
  odometer; it is never compared with it (BR-IS2).
- For the same severity and date noticed, the newest created comes first; for the same resolved date, the
  newest created comes first.
- `PUT` replaces the editable fields (omitting `odometer` or `note` clears them) and never changes the status,
  outcome or resolved date; those change only through resolve and reopen.
- Resolve and reopen on the same issue at the same time: the second request sees the new status and gets
  409.
- "Today" is the server's date (UTC), as for expenses.
- Deleting a vehicle removes its issues through `issue.vehicle_id → vehicle.id ON DELETE CASCADE`.

## API impact

Additive, not breaking. New tag/module `issues` (ADR 0021), depending on `vehicles::api`. All operations
require auth and declare 401.

- **New schemas**
  - `IssueSeverity` enum `WATCH | FIX_SOON | URGENT`; `IssueSource` enum `NOTICED | MECHANIC | WARNING_LIGHT`;
    `IssueOutcome` enum `FIXED | GONE`; `IssueStatus` enum `OPEN | RESOLVED`.
  - `IssueRequest { title (1–60, not blank), severity, source, noticedOn, odometer? (0 … max odometer,
    nullable), note? (≤ 500, nullable) }`.
  - `ResolveIssueRequest { outcome, resolvedOn }`.
  - `Issue { id, vehicleId, title, severity, source, noticedOn, odometer (nullable), note (nullable), status,
    outcome (nullable), resolvedOn (nullable), createdAt }`, all required. `outcome` and `resolvedOn` are
    set only when `status` is `RESOLVED`.
  - `IssueList { open: Issue[], resolved: Issue[] }`, each in BR-IS6 order.
- **New operations** (tag `issues`)
  - `GET /api/vehicles/{vehicleId}/issues` → `listIssues` → 200 `IssueList`; 404. At most *issues per
    vehicle*, so not paginated.
  - `POST /api/vehicles/{vehicleId}/issues` with `IssueRequest` → `createIssue` → 201 `Issue`; 400, 404, 409
    (BR-L8).
  - `GET /api/issues/{issueId}` → `getIssue` → 200 `Issue`; 404. Used by the edit and resolved screens. No MCP
    tool, like `getExpense` (`list_issues` returns every issue).
  - `PUT /api/issues/{issueId}` with `IssueRequest` → `updateIssue` → 200 `Issue`; 400, 404.
  - `DELETE /api/issues/{issueId}` → `deleteIssue` → 204; 404.
  - `POST /api/issues/{issueId}/resolve` with `ResolveIssueRequest` → `resolveIssue` → 200 `Issue`; 400, 404,
    409 (already resolved).
  - `POST /api/issues/{issueId}/reopen` (no body) → `reopenIssue` → 200 `Issue`; 404, 409 (already open).
- **MCP:** tools `list_issues`, `create_issue`, `update_issue`, `delete_issue` (destructive),
  `resolve_issue`, `reopen_issue`, one per operation except `getIssue` (BR-A2). Server instructions: an issue
  is a problem to keep an eye on until fixed; use a log entry for a plain observation and an expense for
  something paid; severities and sources as listed.
- **Migration** `V8__create_issue.sql`: `issue (id uuid PK, vehicle_id uuid NOT NULL FK → vehicle ON DELETE
  CASCADE, title varchar(60) NOT NULL, severity varchar NOT NULL, source varchar NOT NULL, noticed_on date
  NOT NULL, odometer integer NULL CHECK ≥ 0, note varchar(500) NULL, outcome varchar NULL, resolved_on date
  NULL, created_at timestamptz NOT NULL)`, CHECKs on the enum values and `(outcome IS NULL) = (resolved_on IS
  NULL)`, index on `vehicle_id`, row level security on (like `journal_entry`). Add `issue` to the test
  `DatabaseCleaner`.
- **Config:** `autojournal.limits.issues-per-vehicle` (env `LIMIT_ISSUES_PER_VEHICLE`, default 200). Update
  `.env.example` and `docs/operations.md`. It has a default, so production needs no new Render variable.
- **Backend:** new module `issues` (`api` package with module metadata only; `internal` with controller,
  service, DAO, entity, repository, mappers, MCP tools), following `planning`. Ownership via
  `VehicleApi.isOwnedBy`. `docs/architecture.md` module table updated.

## UI notes

- **Design:** canvas boards *Issues · open*, *Issues · resolved expanded*, *Issues · empty*, *Issues · only
  resolved*, *New issue*, *Edit issue*, *Resolve issue (sheet)* and *Resolved issue* (docs/design/design.md,
  Screens). `design.md` gets the Issues tab, issue row, severity pill, chip selector and resolve sheet as
  components and a changelog entry when implemented.
- **Vehicle tab bar:** 4th tab **Issues** (warning-triangle icon) after Planned; route
  `/vehicles/$vehicleId/issues`.
- **List:** section "Open · N" in a card; each row: severity marker, title, line "<source> · <date noticed>
  [· <odometer> km]", severity pill (Urgent = warning style, Fix soon = neutral filled, Watch = outline). Then a
  button "Resolved · N" (collapsed by default, `aria-expanded`) that shows resolved rows: check icon (Fixed)
  or minus-circle icon (Gone), title, "Fixed · <date>" / "Gone · <date>". No section when there are none.
  Rows open the edit screen (open) or the resolved screen (resolved).
- **FAB "Add issue"** opens **New issue**: Title (max 60), Severity chips (Watch | Fix soon | Urgent, default
  Watch), Source chips (I noticed | Mechanic | Warning light, default I noticed), Date noticed (default
  today), "Odometer (optional)", "Note (optional)" with a 0 / 500 counter; "Save issue". No estimated cost (the
  canvas's New issue mock still shows one; it is dropped).
- **Edit issue:** the same form, pre-filled, "Save changes", plus **Resolve issue** (outline) and **Delete
  issue** (asks for confirmation).
- **Resolve issue** sheet: Outcome chips (Fixed | Gone · not an issue, default Fixed), Date resolved (default
  today), button "Resolve". The Expense control in the mock comes in v11.
- **Resolved issue** screen: status pill (Fixed / Gone), title, "Resolved <date>", a card with Severity,
  Source and Noticed (date · odometer), note if any, and **Reopen issue**. Delete is reached by reopening.
- Not shown: the "open 5 mo" age from the mock, any badge or count on the Garage.
- States: loading skeleton, empty and only-resolved states (AC 11), error with retry, submitting, server field
  errors mapped onto fields, 409 on create shown as the limit message.
- Forms per the forms standard (react-hook-form + zod), mirroring BR-IS1 and the resolve date rule.

## E2E

- `report-and-resolve-issue` — add an issue, see it under Open with its severity pill, resolve it as Fixed,
  see it under Resolved, open it and reopen it, see it under Open again.

## Out of scope

- Linking an expense to an issue, or adding one while resolving (v11, specs/issue-expenses.md).
- Estimated cost; turning an issue into a planned expense.
- Counting an issue's odometer in the current odometer or distance.
- Issues in the journal timeline; issue badges or counts on the Garage; the "open N months" age.
- Reminders or notifications; photos; custom severities or sources; issues not tied to a vehicle.
