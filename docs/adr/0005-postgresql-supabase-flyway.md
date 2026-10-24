# 0005. PostgreSQL locally, Supabase in production, Flyway migrations

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

We need one relational database engine across development, CI, and production, with versioned schema
changes and a managed production host. Supabase offers managed Postgres, but also exposes data APIs
(PostgREST / Data API) that would bypass our backend's business rules if left open.

## Decision

- **Engine:** PostgreSQL everywhere, same major version as current Supabase projects (17). Locally via
  `docker-compose.yml`; in tests via Testcontainers; in CI E2E via a service container.
- **Production:** Supabase Postgres, connection from env vars, `sslmode=require`, direct connection or
  session-mode pooler only (transaction mode breaks JDBC prepared statements). See docs/operations.md.
- **Schema:** Flyway (`src/main/resources/db/migration`) runs at backend startup, locally and against
  Supabase. Applied migrations are never edited. Hibernate only validates (`ddl-auto=validate`).
- **Dedicated schema:** all tables live in the `autojournal` schema (Flyway `schemas`/`default-schema`,
  Hibernate `default_schema`). Nothing goes in `public`.
- **The backend is the only database client.** No other component (frontend, scripts, Supabase client
  libraries) reads or writes application data.
- **Supabase Data API unused/disabled:** disable the Data API, or ensure `autojournal` is not in the
  exposed schemas. Never expose `autojournal`.
- **RLS as a safety net:** every migration that creates a table runs
  `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` with no policies. The backend (table owner) bypasses RLS;
  any accidentally exposed role sees nothing.
- **Secrets:** service-role key and DB credentials stay server-side. The frontend only ever holds the
  anon key, for Supabase Auth (ADR 0008).

## Consequences

- Development and production behave the same (no H2 dialect differences).
- Every new table needs the RLS statement in its migration; reviewers check it.
- Supabase features that rely on direct client access (PostgREST, Realtime on these tables) are not used.

## Alternatives considered

- **H2/embedded DB for dev/tests** — dialect drift; rejected (ADR 0010).
- **Liquibase** — Flyway's plain SQL migrations are simpler to review.
- **Supabase client-side data access with RLS policies** — splits business rules between backend and
  policies; rejected in favor of a single backend.
