# autojournal

Full-stack monorepo: Kotlin + Spring Boot backend, React + TypeScript frontend, contract-first
OpenAPI. Developed mainly by AI coding agents together with humans. A small car-expense tracker built to
prove a monorepo, a Spring Modulith backend, and AI-driven development — see the
[goals](AGENTS.md#goals).

| Path         | What                                                         |
| ------------ | ------------------------------------------------------------ |
| `backend/`   | Kotlin, Spring Boot, Spring Modulith, Maven, Flyway          |
| `frontend/`  | React, TypeScript, Vite, TanStack Router/Query, Redux Toolkit |
| `contracts/` | `openapi.yaml` — the API contract; code is generated from it |
| `e2e/`       | Playwright tests for critical user flows                     |
| `docs/`      | Architecture, operations, domain, specs, ADRs                |

**Agents and contributors: start with [`AGENTS.md`](AGENTS.md), then [`docs/`](docs/).**

## Prerequisites

- Docker (with Compose v2)
- JDK 17 (the Maven wrapper downloads Maven itself)
- Node — version in [`frontend/.nvmrc`](frontend/.nvmrc)
- pnpm 12.11.2 — the version pinned in each `package.json` `packageManager` field:
  `npm install -g pnpm@12.11.2` (pnpm 12 ships as a native binary; older corepack releases cannot run it)
- GNU make and a POSIX shell (on Windows: Git Bash)

## Quickstart

```sh
git clone <repo-url> autojournal && cd autojournal
make db-up      # start local Postgres (healthy)
make gen        # generate backend interfaces + frontend API client from contracts/openapi.yaml
make be-run     # terminal 1: backend on http://localhost:8080
make fe-run     # terminal 2: frontend on http://localhost:5173
```

Optional: `cp .env.example .env` to override local defaults. Never commit `.env`.

Run `make help` for all targets. `make check` runs exactly what CI runs.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs only the jobs affected by a change (path filters).
**Only the `ci-ok` job should be configured as a required status check** in branch protection; it
aggregates all other jobs and treats skipped jobs as success.
