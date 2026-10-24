# AGENTS.md — e2e

Playwright end-to-end tests for **critical user flows only**. Edge cases belong in backend and frontend
tests. See [ADR 0012](../docs/adr/0012-e2e-testing-playwright.md).

## Layout

```
e2e/
  CRITICAL_FLOWS.md   index: flow → spec → plan → test file (keep it current)
  plans/              Markdown test plans (planner output, human-reviewed)
  tests/              Playwright tests, one flow per file, named after the flow
  fixtures/           test.ts (api + uniqueName fixtures), urls.ts
  seed.spec.ts        seed test: brings the app into a usable state (used by the agents)
  playwright.config.ts
```

## Workflow: spec → plan → test

1. The feature spec (`docs/specs/<feature>.md`) lists critical flows in its **E2E** section (or "none").
2. **Planner** (`.claude/agents/playwright-test-planner.md`) writes `plans/<flow>.md`.
3. A **human reviews** the plan. Do not generate tests from an unreviewed plan.
4. **Generator** writes `tests/<flow>.spec.ts` from the reviewed plan.
5. Register the flow in `CRITICAL_FLOWS.md`.
6. **Healer** may fix locators and timing only (see rules below).

## Conventions

- Import `test` / `expect` from `fixtures/test.ts`, not from `@playwright/test`.
- Create test data through the backend API (`api` fixture), never by clicking through setup screens.
- Use `uniqueName(prefix)` for every name: tests must be independent and parallel-safe. Never assume an
  empty database.
- Locators: `getByRole` / `getByLabel` / `getByText` first; `data-testid` only when nothing accessible exists.
- No `waitForTimeout`, no `networkidle`; rely on web-first assertions (`await expect(locator).toBeVisible()`).
- One flow per test file; start the file with a comment naming the flow, spec, and plan.

## Healer rules

- May fix locators and timing. **Must never weaken or remove an assertion about business behavior.**
- If a test fails because behavior changed, **stop and ask** whether the spec or the code is wrong.

## Running

| Command                          | What                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `make e2e` (repo root)           | Builds backend jar + frontend, then runs all E2E tests       |
| `pnpm test` (in `e2e/`)          | Runs tests against already-built apps                        |
| `pnpm test:ui` / `pnpm report`   | Playwright UI mode / open the last HTML report               |

`playwright.config.ts` `webServer` starts Postgres (docker-compose; reused if already up), the backend jar,
and `vite preview` of the frontend build. Chromium only.
