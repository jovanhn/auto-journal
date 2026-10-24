# 0009. CI with path filters and a single required gate job

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

In a monorepo, running every job on every change wastes time, but branch protection cannot require jobs
that are sometimes skipped (a skipped required check blocks or passes unpredictably).

## Decision

- GitHub Actions workflow `.github/workflows/ci.yml` on `pull_request` and `push` to `main`, with
  `concurrency` cancelling superseded runs and `permissions: contents: read`.
- A `changes` job (`dorny/paths-filter`) decides which jobs run:
  `backend` ← `backend/**`, `contracts/**`; `frontend` ← `frontend/**`, `contracts/**`;
  `contracts` ← `contracts/**`; `e2e` ← `e2e/**`, `frontend/**`, `backend/**`, `contracts/**`.
  `docs/**` triggers no build jobs.
- A `ci-ok` gate job `needs` all jobs, runs `if: always()`, and fails if any needed job failed or was
  cancelled; skipped jobs count as success. **Only `ci-ok` is a required status check.**
- Every action is pinned to an exact version. Dependabot updates Maven, npm, and Actions weekly, grouped.
- `make check` runs the same checks locally.

## Consequences

- Docs-only PRs merge quickly; contract changes exercise both apps.
- New jobs must be added to `ci-ok.needs`, or they are not enforced.

## Alternatives considered

- **Separate workflows per app with required checks each** — skipped workflows block merges.
- **No path filters** — slow feedback on every change.
