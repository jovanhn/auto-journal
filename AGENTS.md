# AGENTS.md

Instructions for AI coding agents (Codex, Claude Code, …) and humans. `CLAUDE.md` files only import the
`AGENTS.md` next to them. Each sub-project has its own `AGENTS.md`; read it before working there.

## What this is

**autojournal** is a small private app for tracking car expenses. A user adds one or more vehicles (nickname,
make, model, year, optional plate, current odometer, purchase price and date) and logs expenses per vehicle
(date, amount, category, optional odometer and note). Categories are fixed: Fuel, Service, Repairs, Insurance,
Registration & tax, Tires, Parking & tolls, Other. The app shows yearly and monthly totals, a breakdown by
category, average monthly cost, and cost per km. Car value currently equals the purchase price; it will later
be estimated from age and market data. Users can also plan upcoming expenses (due date, estimated amount,
one-time or yearly), mark them as paid to turn them into real expenses, and see a 12-month cost projection.

Keep the scope minimal: no accounts, sync, receipt photos, notifications, or multi-currency for now. The UI is
mobile-first; follow [docs/design/design.md](docs/design/design.md) and the reference screens in
`docs/design/screens/` (Garage, Expenses, Insights, Planned, Add expense, Add vehicle) for layout,
navigation, and styling.

Full-stack monorepo: Kotlin + Spring Boot modular monolith, React + TypeScript SPA, contract-first OpenAPI,
PostgreSQL (Supabase in production).

| Path         | What                                                     | Instructions                                     |
| ------------ | -------------------------------------------------------- | ------------------------------------------------ |
| `backend/`   | Kotlin, Spring Boot, Spring Modulith, Maven, Flyway      | [backend/AGENTS.md](backend/AGENTS.md)           |
| `frontend/`  | React, Vite, TanStack Router/Query, Redux Toolkit, shadcn | [frontend/AGENTS.md](frontend/AGENTS.md)        |
| `contracts/` | `openapi.yaml` — the API contract                        | [contracts/AGENTS.md](contracts/AGENTS.md)       |
| `e2e/`       | Playwright tests for critical flows                      | [e2e/AGENTS.md](e2e/AGENTS.md)                   |
| `docs/`      | architecture, operations, domain, specs, ADRs, design    | [docs/AGENTS.md](docs/AGENTS.md)                 |

Start with [docs/architecture.md](docs/architecture.md) and [docs/operations.md](docs/operations.md).

## Source of truth

`docs/domain` → `docs/specs` → `contracts/openapi.yaml` → code.

Higher wins. **If they conflict, stop and ask.** Do not invent product requirements.

`docs/design/design.md` (+ `docs/design/screens/`) is the source of truth for **how the UI looks** — layout,
navigation, styling — but never for behavior: a field, rule, or calculation that appears only in a mock is
not a requirement; ask.

## Feature workflow

1. Read the spec (`docs/specs/`), the relevant domain docs (`docs/domain/`), the ADRs (`docs/adr/`), and for
   UI work `docs/design/design.md` and the affected screens in `docs/design/screens/src/`.
2. If the spec is missing or ambiguous, **ask before coding**.
3. Update `contracts/openapi.yaml` first, then `make gen`.
4. Backend: migration → domain → persistence → application → api (Flyway migration, entity, repository/DAO,
   service, controller). Write tests from the acceptance criteria.
5. Frontend: use the generated hooks (wrapped in feature hooks); forms per the forms standard; match the
   design using its tokens (never hex values or inline styles copied from the mocks); tests.
6. Run `make check`.
   - 6b. If the spec lists critical E2E flows: create/update the plan in `e2e/plans/` (planner), get it
     reviewed by a human, then generate the test (generator). Update `e2e/CRITICAL_FLOWS.md`.
7. Update the spec status and docs; add an ADR for any architectural change.

## Hard rules

- **Database access standard:**
  > Use Spring Data JPA for module-owned persistence and `JdbcClient` for complex or
  > cross-module reads. Do not introduce other database access APIs or frameworks
  > without architectural approval.
- **No new dependencies or frameworks** without approval via an ADR. Ask first.
- **Never edit generated code** (`backend/target/generated-sources`, `frontend/src/shared/api/generated`,
  `docs/design/screens/src`) or the Claude Design export (`docs/design/screens/*.html`).
- **Never edit applied migrations.** Add a new `V<n>__<description>.sql`.
- **No server data in Redux.** Server data lives in TanStack Query.
- **Contract-first, always.** API changes start in `contracts/openapi.yaml`. Breaking changes need explicit approval.
- **No secrets in the repo.** Use env vars; `.env` is gitignored; `.env.example` lists every variable.
- **Only the backend talks to the database.** Never add Supabase data access (supabase-js queries,
  PostgREST) to the frontend. Supabase is only for (future) auth on the frontend.
- **Module boundaries:** other modules are used only through their `api` package (Spring Modulith verifies).
- **E2E healer:** may fix locators and timing, but must never weaken or remove an assertion about business
  behavior. If a test fails because behavior changed, stop and ask whether the spec or the code is wrong.

## Commands

Run from the repo root (GNU make + POSIX shell; Git Bash on Windows).

| Command               | What                                                                   |
| --------------------- | ---------------------------------------------------------------------- |
| `make db-up` / `db-down` | Start (healthy) / stop local Postgres                              |
| `make gen`            | Generate backend interfaces + frontend client from the contract        |
| `make be-run`         | Run backend on :8080 (needs `make db-up`)                              |
| `make fe-run`         | Run frontend on :5173 (proxies `/api` to :8080)                        |
| `make be-test`        | Backend tests, Modulith verification, ktlint (`./mvnw verify`)         |
| `make fe-test`        | Frontend tests (Vitest)                                                |
| `make contracts-lint` | Redocly lint of `openapi.yaml`                                         |
| `make lint`           | All linters                                                            |
| `make test`           | Backend + frontend tests                                               |
| `make e2e`            | Build both apps and run Playwright against the full stack              |
| `make design-unpack`  | Extract readable screen sources from the Claude Design export          |
| `make check`          | **Exactly what CI runs** — must pass before you finish                 |

## Definition of Done

- Acceptance criteria of the spec are implemented and covered by tests (backend and/or frontend).
- `make check` passes (contracts lint, backend verify incl. Modulith + ktlint, frontend lint/typecheck/test/build, e2e).
- Contract, generated clients, and implementation agree; no generated code edited.
- Loading, empty, and error states handled in any new UI.
- Critical flows from the spec's E2E section have a reviewed plan and a passing test.
- Spec status updated; docs and ADRs updated for any change in behavior or architecture.
- No new dependency without an ADR; no secrets committed.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`, imperative mood.
Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`, `build`, `perf`.
Scopes: `backend`, `frontend`, `contracts`, `e2e`, `docs`, `design`, or a module (`projects`, `tasks`).
One logical change per commit. Mark breaking changes with `!` and a `BREAKING CHANGE:` footer.
