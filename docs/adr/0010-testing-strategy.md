# 0010. Testing strategy

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Tests must give agents fast, trustworthy feedback. In-memory database substitutes and mocked network layers
that diverge from production hide real bugs.

## Decision

**Backend**

- JUnit 5 (JUnit Jupiter), Spring Boot Test, MockK for unit tests, Testcontainers PostgreSQL for
  integration tests. **No H2.**
- `ModularityTests` (Spring Modulith `verify()`) in every build.
- Every cross-module read DAO has an integration test against Testcontainers Postgres.
- API integration tests per module (`@IntegrationTest`: full context + MockMvc + Testcontainers).
- Tests are written from the spec's acceptance criteria.

**Frontend**

- Vitest + React Testing Library + MSW (network-level mocks of the real contract paths).
- Tests render the real app (providers + router) via `renderApp(url)` and query by role/label, not by
  class or test ID.

**End-to-end** — Playwright for critical flows only (ADR 0012).

## Consequences

- Backend tests require Docker (Testcontainers); CI runners have it.
- Integration tests are slower than unit tests but catch SQL, migration, and mapping errors.

## Alternatives considered

- **H2** — dialect differences (e.g. `FILTER`, `LOWER()` unique indexes) would pass tests and fail in production.
- **Mocking fetch / Orval hooks in frontend tests** — couples tests to implementation details; MSW tests the
  real request path.
