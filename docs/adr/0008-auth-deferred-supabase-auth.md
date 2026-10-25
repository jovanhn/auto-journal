# 0008. Authentication deferred; future plan: Supabase Auth + backend resource server

- **Status:** Superseded by [0013](0013-authentication-supabase-auth-from-first-feature.md)
- **Date:** 2026-10-24

## Context

The skeleton has no users yet. Adding authentication now would add configuration and test friction without
a product requirement. The production database is Supabase, which also provides Supabase Auth.

## Decision

- **Now:** no authentication and no Spring Security. The OpenAPI contract has no security schemes
  (Redocly `security-defined` is disabled with a comment until auth arrives).
- **Later:** Supabase Auth on the frontend (sign-in, session, token refresh) using only the **anon** key.
  The backend becomes an **OAuth2 resource server** that validates Supabase-issued JWTs (issuer/JWKS) on
  every `/api` request. Authorization decisions stay in the backend.
- The frontend attaches the access token in exactly one place: `src/shared/api/http.ts`.
- Supabase is used for auth only, never for data access from the frontend (ADR 0005).

## Consequences

- Until auth lands, the API must not be deployed publicly with real data.
- Adding auth will need: a contract `securitySchemes` + `security`, Spring Security resource-server
  dependency (new ADR-approved dependency), JWT config via env vars, and test utilities for authenticated calls.

## Alternatives considered

- **Spring Security sessions / own user table** — reinvents what Supabase Auth provides.
- **Auth now** — premature without users or requirements.
