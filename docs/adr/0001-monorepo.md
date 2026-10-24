# 0001. Monorepo

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

The product has a backend, a frontend, an API contract shared by both, end-to-end tests, and documentation.
It is developed mainly by AI coding agents, which work best when every related artifact (spec, contract,
code, tests) is visible in one checkout and can be changed atomically.

## Decision

Use a single repository with top-level `backend/`, `frontend/`, `contracts/`, `e2e/`, and `docs/`. Each
part keeps its own toolchain (Maven, pnpm packages); the root `Makefile` is the shared entry point and
`make check` runs exactly what CI runs. Agent instructions live in `AGENTS.md` files (with `CLAUDE.md`
importing them).

## Consequences

- One pull request can change contract, backend, frontend, and docs together.
- CI must avoid running everything on every change: path filters (ADR 0009).
- Separate lockfiles per Node package (`contracts`, `frontend`, `e2e`); no workspace tooling needed yet.

## Alternatives considered

- **Polyrepo (backend / frontend / contract repos)** — cross-cutting changes need coordinated PRs and
  versioned contract publishing; worse for agents that need full context.
- **JS monorepo tooling (Nx, Turborepo)** — unnecessary for one frontend package.
