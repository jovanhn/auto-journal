# 0013. Authentication with Supabase Auth from the first feature

- **Status:** Proposed
- **Date:** 2026-10-25

## Context

ADR 0008 deferred authentication because the skeleton had no users. The car-expense product now requires
accounts: each user owns their vehicles and sees only their own data (domain BR-U1, BR-U2), and the display
currency is a per-user preference (BR-U4). Adding ownership to existing tables and APIs later is the most
painful kind of migration, so auth comes first.

## Decision

- Implement the "Later" plan of ADR 0008 **now**, as the first feature (before vehicles):
  Supabase Auth on the frontend (email + password, **anon** key only); the backend is an **OAuth2 resource
  server** validating Supabase-issued JWTs (issuer/JWKS) on every `/api` request.
- The JWT `sub` is the user id. The backend stores only app data about a user (`user_profile`, module
  `users`); identity, passwords and sessions stay in Supabase.
- Every user-owned row is scoped by owner in the backend; another user's resource responds 404.
- The contract gets `securitySchemes` (bearer JWT) and global `security`; Redocly `security-defined` is
  re-enabled.
- The frontend attaches the access token only in `src/shared/api/http.ts` (unchanged from ADR 0008).

## Consequences

- New dependency: Spring Security OAuth2 resource server (approved by this ADR).
- Tests need utilities for authenticated calls (backend: mock JWTs; e2e: a test user or token strategy).
- New env vars for the JWT issuer / JWKS and the frontend Supabase URL + anon key (`operations.md`,
  `.env.example`).
- Local development needs a Supabase project or local issuer — to be decided in the auth spec.

## Alternatives considered

- **Keep auth deferred (ADR 0008), placeholder user** — cheaper now, but every table and endpoint must be
  migrated to owner scoping later.
- **Own user table + Spring Security sessions** — reinvents what Supabase Auth provides (as in ADR 0008).
