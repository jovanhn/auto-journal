# 0012. E2E testing: Playwright for critical flows

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

End-to-end tests are slow and brittle when they try to cover everything. They are valuable for a few
critical user journeys across the full stack (browser → frontend → backend → database).

## Decision

- `/e2e` is its own pnpm package with pinned `@playwright/test`, Chromium only for now.
- `playwright.config.ts` `webServer` starts the full stack: Postgres (docker-compose; reused when already
  running or provided by a CI service container), the backend jar, and the built frontend (`vite preview`).
- **Critical flows only.** Each feature spec has an **E2E** section listing critical flows (or "none").
- Workflow **spec → plan → test** using Playwright test agents (`npx playwright init-agents --loop=claude`):
  the **planner** writes `e2e/plans/<flow>.md`, a **human reviews** the plan, the **generator** writes
  `e2e/tests/<flow>.spec.ts`, and the flow is registered in `e2e/CRITICAL_FLOWS.md`.
- The **healer** may fix locators and timing but must never weaken or remove an assertion about business
  behavior; if behavior changed, it stops and asks whether the spec or the code is wrong. The generated
  agent definitions in `.claude/agents/` carry these project rules.
- Test data is created via the backend API in fixtures, with unique names per test (parallel-safe).
- Accessible locators first (`getByRole`, `getByLabel`, `getByText`); no `waitForTimeout`.
- CI runs an `e2e` job (Postgres service container), uploads the HTML report and traces on failure, and is
  part of the `ci-ok` gate (ADR 0009).

## Consequences

- E2E stays small and meaningful; regressions in core journeys are caught before merge.
- Plans are reviewable artifacts, so test intent is explicit.
- `.mcp.json` runs the Playwright test MCP server from the pinned local install in `e2e/`.

## Alternatives considered

- **Cypress** — Playwright was chosen for multi-browser support, speed, and its test agents.
- **Broad E2E coverage** — slow and flaky; edge cases belong in unit/integration tests.
