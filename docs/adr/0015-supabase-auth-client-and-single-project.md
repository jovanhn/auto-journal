# 0015. Supabase Auth client and a single Supabase project

- **Status:** Accepted
- **Date:** 2026-10-25

## Context

ADR 0013 brings Supabase Auth forward and approves the backend resource-server dependency, but does not
name the frontend auth client or say which Supabase project local development and E2E tests sign in
against (specs/auth.md).

## Decision

- **Frontend dependency:** `@supabase/supabase-js`, used **only** for Supabase Auth (sign-in, session,
  token refresh, sign-out) with the publishable key (formerly "anon" key). Never for data access
  (ADR 0005). It is wrapped in one frontend module; the token is attached only in `src/shared/api/http.ts`.
- **One Supabase project** for everything: its **auth** is used by production, local development and E2E;
  its **database** is the production database only. Local development and E2E keep their data in the local
  Docker Postgres (ADR 0005), so they never write to production data.
- **Accounts** are created in the Supabase dashboard (closed sign-up). E2E signs in as a dedicated test
  user; its credentials come from `.env` locally and from CI secrets in CI.
- **Backend tests** do not call Supabase: they use mocked JWTs (Spring Security test support).

## Consequences

- Running the app locally or the E2E suite needs network access and the project's env vars
  (`operations.md`, `.env.example`). Without them only backend tests run.
- CI needs secrets: Supabase URL, publishable key, E2E test user email and password.
- The E2E test user is a real account in the production auth; give it a strong password and no real data.
  Its app data lives only in the local/CI database.
- A local backend accepts real production tokens, but only against the local database.
- If the project ever needs isolated auth for testing, add a second project (new ADR).

## Alternatives considered

- **Separate dev and prod projects** — cleaner isolation, but a second project to manage for a small app.
- **Local Supabase via the Supabase CLI** — fully offline, but adds a new tool and a heavy Docker stack for
  auth alone.
- **Mock JWT issuer in E2E** — fast, but E2E would never exercise the real sign-in.
