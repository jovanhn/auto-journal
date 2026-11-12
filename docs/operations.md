# Operations

## Local setup

Prerequisites: Docker (Compose v2), **JDK 17**, Node (version in `frontend/.nvmrc`), pnpm 12.11.2
(`npm install -g pnpm@12.11.2`; pinned in each `package.json` `packageManager` field), GNU make, a POSIX shell
(Git Bash on Windows).

```sh
make db-up      # Postgres 17 in Docker, waits until healthy
make gen        # generate backend interfaces + frontend client from contracts/openapi.yaml
make be-run     # backend  → http://localhost:8080  (health: /actuator/health)
make fe-run     # frontend → http://localhost:5173  (proxies /api → :8080)
make check      # exactly what CI runs (contracts, backend, frontend, e2e)
make db-down    # stop Postgres (the named volume keeps data)
```

Reset local data: `docker compose down -v` (deletes the `autojournal-pgdata` volume).

### JDK version

The backend targets **Java 17** (`<java.version>17</java.version>`, CI uses Temurin 17). The original plan
was JDK 21; it was changed to the JDK available on the development machine. Spring Boot 4 supports 17+.
Moving to 21 later is a one-line change in `backend/pom.xml` plus the CI `java-version` values.

## Environment variables

All variables with local defaults are listed in [`.env.example`](../.env.example). Never commit `.env`.

| Variable                 | Used by          | Local default                                   | Production                    |
| ------------------------ | ---------------- | ----------------------------------------------- | ----------------------------- |
| `POSTGRES_DB/USER/PASSWORD`, `POSTGRES_PORT` | docker-compose | `autojournal` / `autojournal` / `autojournal`, `5432` | n/a |
| `DB_URL`                 | backend          | `jdbc:postgresql://localhost:5432/autojournal`  | required (see Supabase below) |
| `DB_USERNAME`            | backend          | `autojournal`                                   | required                      |
| `DB_PASSWORD`            | backend          | `autojournal`                                   | required, secret              |
| `SERVER_PORT`            | backend          | `8080`                                          | optional                      |
| `SPRING_PROFILES_ACTIVE` | backend          | `local` (default profile)                       | `prod`                        |
| `CORS_ALLOWED_ORIGINS`   | backend          | `http://localhost:5173,http://localhost:4173` (the Vite proxy forwards the browser's `Origin`) | frontend origin(s), comma-separated (ADR 0017) |
| `MCP_RESOURCE_URL`       | backend (`autojournal.mcp.resource-url`) | `http://localhost:8080/mcp` | `https://be-autojournal.skverly.com/mcp`; **required** in `prod` (ADR 0018) |
| `APP_VERSION`            | backend (`autojournal.version`, `GET /api/status`) | `local` | set by the image (`--build-arg APP_VERSION=<sha>` in CI) |
| `VITE_API_BASE_URL`      | frontend (build) | `/api`                                          | URL of the backend `/api`     |
| `SUPABASE_URL`           | backend          | project URL (from `.env`)                       | project URL (JWT issuer `<url>/auth/v1`) |
| `VITE_SUPABASE_URL`      | frontend (build) | project URL                                     | project URL                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend (build) | project publishable key                  | project publishable key       |
| `EXCHANGE_RATE_RSD_PER_EUR`, `EXCHANGE_RATE_USD_PER_EUR` | backend (`autojournal.exchange-rates.rsd-per-eur` / `usd-per-eur` → `shared.money.ExchangeRates`) | `117.00`, `1.10` | set by the owner (ADR 0014); a change affects only new rate snapshots and display conversions |
| `LIMIT_VEHICLES_PER_USER`, `LIMIT_JOURNAL_ENTRIES_PER_VEHICLE`, `LIMIT_PLANNED_EXPENSES_PER_VEHICLE`, `LIMIT_ISSUES_PER_VEHICLE`, `LIMIT_MAX_ODOMETER_KM`, `LIMIT_MAX_RECURRENCE_MONTHS`, `LIMIT_EARLIEST_DATE`, `LIMIT_PLANNED_YEARS_AHEAD` | backend (`autojournal.limits.*` → `shared.limits.LimitProperties`) | `10`, `3000`, `50`, `200`, `2000000`, `120`, `1900-01-01`, `10` | optional data limits (BR-L1…L8, specs/data-limits.md, specs/issues.md); numbers ≥ 1, earliest date not in the future, otherwise the backend does not start |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | e2e | test user in the Supabase project               | CI secrets only               |

The Supabase and E2E variables come from the single Supabase project (specs/auth.md, ADR 0015). Locally,
all three apps read the repo-root `.env`: the backend via `spring.config.import` (profile `local`), the
frontend via Vite `envDir: '..'`, and e2e via `fixtures/env.ts`. The backend validates Supabase-issued
JWTs (ES256, JWKS at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`); tests sign tokens with a local key.

Spring profiles: `local` (default; env vars with docker-compose defaults), `test` (Testcontainers),
`prod` (env vars only, no defaults for secrets — the app fails to start if they are missing).

## Production: Supabase Postgres

- **Connection string from env vars only.** Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` in the hosting
  platform's secret store; run with `SPRING_PROFILES_ACTIVE=prod`.
- **TLS:** `DB_URL` must include `sslmode=require`, e.g.
  `jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require`.
- **Connection mode:** use the **direct connection** or the Supavisor **session-mode pooler** (port 5432).
  Production uses the session pooler (the direct host is IPv6-only; Render has no IPv6 egress), see
  [Deployment](#deployment).
  Do **not** use transaction-mode pooling (port 6543): it breaks the server-side prepared statements used
  by the PostgreSQL JDBC driver / HikariCP.
- **Migrations:** Flyway runs automatically at backend startup against Supabase and creates/uses the
  `autojournal` schema. Nothing is created in `public`. Applied migrations are never edited.
- **Only the backend talks to the database.** In the Supabase dashboard, disable the Data API, or make
  sure `autojournal` is **not** in the exposed schemas list. Never expose `autojournal`.
- **RLS:** every table has Row Level Security enabled with no policies, so the `anon` / `authenticated`
  roles can read nothing even if the schema were exposed. The backend connects as the table owner and
  bypasses RLS.
- **Secrets:** the service-role key and database credentials stay server-side only. The frontend will
  only ever hold the Supabase **anon** key, for Supabase Auth (ADR 0013).
- **Health:** only `/actuator/health` is exposed.

## CI

`.github/workflows/ci.yml` — path-filtered jobs (`contracts`, `backend`, `frontend`, `e2e`) plus the `ci-ok`
gate. On `main` only, `backend-image` and `backend-deploy` run after `ci-ok` (see [Deployment](#deployment));
they are not part of the gate. Configure **only `ci-ok`** as the required status check. Dependabot updates Maven, npm
(`frontend`, `contracts`, `e2e`) and GitHub Actions weekly, grouped. See ADR 0009.

The `e2e` job signs in a real Supabase user and needs these repository secrets: `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (the test user is created by hand in the
Supabase dashboard; there is no email sign-up).

## Deployment

ADRs 0016 (backend), 0017 (frontend hosting) and 0022 (frontend delivery). Everything deploys from `main`; there are no staging or preview
environments.

| Part     | URL                                  | Host                                           | Deployed by                                   |
| -------- | ------------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| Frontend | https://autojournal.skverly.com      | Cloudflare Worker `auto-journal` (static assets) | GitHub Actions `ci.yml` → `wrangler deploy`     |
| Backend  | https://be-autojournal.skverly.com   | Render web service (Docker image from GHCR)    | GitHub Actions `ci.yml` → Render deploy hook  |
| Database | —                                    | Supabase project `dnkgfohtcbidlzjivkkl` (Postgres + Auth) | Flyway at backend startup             |

The backend is also reachable at `https://auto-journal-backend-latest.onrender.com`; use the custom domain.
DNS for `skverly.com` is on Cloudflare.

### Backend (Render)

**Flow:** push to `main` touching `backend/**` or `contracts/**` → CI passes (`ci-ok`) →
`backend-image` builds `backend/Dockerfile` and pushes `ghcr.io/jovanhn/auto-journal-backend:<sha>` and
`:latest` → `backend-deploy` (GitHub environment `production`, no approval) calls the Render deploy hook
with `imgURL=<sha image>`. Render pulls it, starts it, and waits for `/actuator/health`. Flyway migrations
run at startup, so a merged migration reaches production with the next backend deploy. The free instance
sleeps when idle; the first request after that waits for a cold start (2–3 min as of 2026-11).

**Render service** (workspace "Code's workspace" `tea-d8peuf1o3t8c73elqip0`):

| Setting            | Value                                                          |
| ------------------ | -------------------------------------------------------------- |
| Service ID         | `srv-dbiu9vg473hc73alkesg` (name `auto-journal-backend:latest`) |
| Image              | `ghcr.io/jovanhn/auto-journal-backend` (public GHCR package, no registry credential) |
| Region / plan      | Frankfurt / Free (512 MB; the image sets `-XX:MaxRAMPercentage=75`) |
| Health check path  | `/actuator/health`                                             |
| Auto-deploy        | Off — only CI deploys                                          |
| Custom domain      | `be-autojournal.skverly.com`                                   |

**Render environment variables** (secrets are set in the Render dashboard, never committed):

| Variable               | Value                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `PORT`                 | `8080` (Render routes to `PORT`; the app listens on `SERVER_PORT`, default 8080)   |
| `DB_URL`               | `jdbc:postgresql://aws-1-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=require` (session pooler) |
| `DB_USERNAME`          | `postgres.dnkgfohtcbidlzjivkkl`                                                    |
| `DB_PASSWORD`          | secret — Supabase database password (`SUPABASE_DB_PASSWORD` in the local `.env`)   |
| `SUPABASE_URL`         | `https://dnkgfohtcbidlzjivkkl.supabase.co`                                         |
| `CORS_ALLOWED_ORIGINS` | `https://autojournal.skverly.com`                                                  |
| `MCP_RESOURCE_URL`     | `https://be-autojournal.skverly.com/mcp` (ADR 0018)                                |
| `SPRING_PROFILES_ACTIVE` | not set — `prod` is the image default                                            |

Exchange rates and data limits use the defaults from `application.yml`; set `EXCHANGE_RATE_*` or `LIMIT_*` on
Render to change them.
Changing an environment variable on Render restarts the service with the current image.

**Rollback:** in Render, redeploy an earlier deploy, or deploy an older `:<sha>` tag. Avoid "Manual
Deploy" of `:latest` for releases: the running version then no longer names its commit.

Build and run the image locally:

```sh
docker build -f backend/Dockerfile -t autojournal-backend .     # from the repo root (needs contracts/)
docker run --rm -p 8080:8080 -e DB_URL=jdbc:postgresql://host.docker.internal:5432/autojournal \
  -e DB_USERNAME=autojournal -e DB_PASSWORD=autojournal -e SUPABASE_URL=<project url> autojournal-backend
```

**Public endpoints besides `/api`:** `GET /api/status` (no token, no database; wake-up check),
`/actuator/health`, `GET /.well-known/oauth-protected-resource` (RFC 9728 metadata for MCP clients) and
`POST /mcp` (MCP server for assistants, Bearer token required). See [assistant.md](assistant.md).

**Wake-up protocol** (the free plan sleeps after 15 min idle): a client calls `GET /api/status` with a 5 s
timeout; on a timeout, a connection error, a 502/503/504 or a body that is not the status JSON, it waits
50 s and retries, at most 3 times, then reports the backend as unavailable. The MCP server tells
assistants the same (specs/assistant-mcp.md, AC 2–3). Cold starts currently take 133–169 s (Render logs,
2026-11), so the 3 retries are needed; a faster startup or keep-warm ping is a separate decision.

### Google sign-in (ADR 0019)

Owner steps; agents have no access to the Supabase or Google dashboards:

1. Google Cloud console → OAuth client (type *Web application*); Authorized redirect URI
   `https://dnkgfohtcbidlzjivkkl.supabase.co/auth/v1/callback`. The client secret goes only into Supabase.
2. Supabase → Authentication → Sign In / Providers → Google: enabled, with the client id and secret.
   **Allow new users to sign up** is on (any Google account becomes a user). Keep **Confirm email** on, so
   an email sign-up made directly against the Supabase API needs a verified address.
3. Authentication → URL Configuration → **Redirect URLs** must include `https://autojournal.skverly.com/**`
   and `http://localhost:5173/**`; the app returns to `<origin>/auth/callback`. A URL not on the list falls
   back to the Site URL and the sign-in is lost. Keep the Site URL exact (see below).

### Supabase OAuth server (assistants, ADR 0018)

Owner steps in the Supabase dashboard (project `dnkgfohtcbidlzjivkkl`); agents have no access:

1. Authentication → OAuth Server → enable it; Authorization Path `/oauth/consent` (with the Site URL this
   is `https://autojournal.skverly.com/oauth/consent`, served by the frontend). Authentication → URL
   Configuration → **Site URL** must be exactly `https://autojournal.skverly.com`. Supabase sends the
   browser to `<Site URL>/oauth/consent`, so `http://localhost:3000` or a `/**` wildcard there breaks the
   consent step (the authorization stays `pending`). Wildcards belong in **Redirect URLs**.
2. Register the OAuth app **Claude** with redirect URIs `https://claude.ai/api/mcp/auth_callback` and
   `https://claude.com/api/mcp/auth_callback`. Keep dynamic client registration **off**. The user enters
   the client id (and secret) in the connector's "Advanced settings" in Claude.
3. JWT signing key: asymmetric ES256 (the backend already requires it). OAuth tokens then validate like
   app tokens.

Grants can be revoked in the dashboard; a user revokes access by removing the connector in Claude.

### Frontend (Cloudflare)

The Worker `auto-journal` serves the Vite build as static assets (`frontend/wrangler.jsonc`; unknown paths
fall back to `index.html`). Cloudflare only hosts it; Workers Builds is disconnected from the repo (ADR 0022).

**Flow:** push to `main` touching `frontend/**`, `contracts/**` or `ci.yml` → CI passes (`ci-ok`) →
`frontend-deploy` (GitHub environment `production`) runs `pnpm build` with the production `VITE_*` values,
then `npx --yes wrangler@<pinned> deploy` from `frontend/`. Pull requests never deploy.

GitHub environment `production` (the owner sets the secret; the variables are publishable values, which
Vite inlines at build time):

- Secret `CLOUDFLARE_API_TOKEN`: custom API token, *Account → Workers Scripts → Edit* on the account.
- Variables `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_BASE_URL=https://be-autojournal.skverly.com/api`,
  `VITE_SUPABASE_URL=https://dnkgfohtcbidlzjivkkl.supabase.co`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Custom domain `autojournal.skverly.com` (Cloudflare dashboard).

**Redeploy** without a code change (e.g. after changing a `VITE_*` variable): re-run the `frontend-deploy`
job of the latest `main` run. **Rollback:** Cloudflare dashboard → Worker → Deployments, or
`wrangler rollback`.

A frontend origin that must call the API (another domain, the `*.workers.dev` URL) has to be added to
`CORS_ALLOWED_ORIGINS` on Render, comma-separated. Supabase → Authentication → URL Configuration: the Site
URL is `https://autojournal.skverly.com`.

### GitHub

- Environment `production` (no protection rules): secrets `RENDER_DEPLOY_HOOK_URL` (a credential: anyone
  with it can deploy) and `CLOUDFLARE_API_TOKEN`; variables for the frontend build (see above). The mock workflow `deploy-protected.yml` also uses this environment.
- Repository secrets for the `e2e` job: see [CI](#ci).
- The GHCR package `auto-journal-backend` is public and linked to the repo (`org.opencontainers.image.source`).

### Changing deployment-relevant things

| Change                               | Also do                                                                     |
| ------------------------------------ | --------------------------------------------------------------------------- |
| New/renamed backend env var          | `application*.yml`, `.env.example`, the env var table above, **and set it on Render before merging** (a missing `prod` value stops the app from starting) |
| New/renamed `VITE_*` variable        | `.env.example`, this doc, `frontend-deploy` env in `ci.yml`, **and the `production` environment variables** |
| New frontend domain                  | `CORS_ALLOWED_ORIGINS` on Render; Supabase URL configuration                 |
| Supabase OAuth server / OAuth apps   | Owner, in the dashboard (see above); the consent page is `/oauth/consent`   |
| New Flyway migration                 | Nothing extra — runs on the next backend deploy; it must be safe against production data |
| `Dockerfile` / `ci.yml` delivery jobs | ADR 0016/0022; verify on `main` (the deploy jobs never run on PRs)          |

### Access for agents

- **GitHub:** `gh` CLI — runs, logs, PRs, environments, secrets (names only).
- **Render:** the Render MCP plugin (workspace `tea-d8peuf1o3t8c73elqip0`, service
  `srv-dbiu9vg473hc73alkesg`): deploys, events, logs, metrics, and environment variable updates. It cannot
  create image-backed services or change service settings (domains, health check, plan) — those are
  dashboard-only. Use `list_events` to see why a deploy failed (it reports exit codes and health check
  failures that logs may not show).
- **Cloudflare:** no dashboard access for agents. Deploys run in GitHub Actions (`frontend-deploy` logs via
  `gh`); ask the owner for dashboard changes (domains, rollback in the UI).
- **Ask before** changing Render environment variables, triggering deploys or rollbacks, or touching
  GitHub environments and secrets — these change production. Reading status and logs is fine.
- **Secrets:** never read secret values from `.env` into the conversation or logs, and never commit them.
  The local `.env` also holds ops-only values (`SUPABASE_DB_PASSWORD`, `SUPABASE_SECRET_KEY`,
  `RENDER_DEPLOY_HOOK_URL`); the owner enters secrets into Render and GitHub.
