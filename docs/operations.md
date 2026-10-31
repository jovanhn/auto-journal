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
| `VITE_API_BASE_URL`      | frontend (build) | `/api`                                          | URL of the backend `/api`     |
| `SUPABASE_URL`           | backend          | project URL (from `.env`)                       | project URL (JWT issuer `<url>/auth/v1`) |
| `VITE_SUPABASE_URL`      | frontend (build) | project URL                                     | project URL                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend (build) | project publishable key                  | project publishable key       |
| `EXCHANGE_RATE_RSD_PER_EUR`, `EXCHANGE_RATE_USD_PER_EUR` | backend (`autojournal.exchange-rates.rsd-per-eur` / `usd-per-eur` → `shared.money.ExchangeRates`) | `117.00`, `1.10` | set by the owner (ADR 0014); a change affects only new rate snapshots and display conversions |
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
gate. Configure **only `ci-ok`** as the required status check. Dependabot updates Maven, npm
(`frontend`, `contracts`, `e2e`) and GitHub Actions weekly, grouped. See ADR 0009.

The `e2e` job signs in a real Supabase user and needs these repository secrets: `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` (the test user is created by hand in the
Supabase dashboard; sign-up is closed).

## Backend deployment (Render)

ADR 0016. On every push to `main` that touches `backend/**` or `contracts/**` and passes `ci-ok`, CI builds
`backend/Dockerfile`, pushes `ghcr.io/jovanhn/auto-journal-backend:<sha>` (+ `:latest`) and calls the Render
deploy hook with that exact image.

Build and run the image locally:

```sh
docker build -f backend/Dockerfile -t autojournal-backend .     # from the repo root
docker run --rm -p 8080:8080 -e DB_URL=jdbc:postgresql://host.docker.internal:5432/autojournal \
  -e DB_USERNAME=autojournal -e DB_PASSWORD=autojournal -e SUPABASE_URL=<project url> autojournal-backend
```

One-time setup:

1. **GHCR package** — after the first publish, open the `auto-journal-backend` package on GitHub →
   Package settings → change visibility to **Public** (or add a registry credential in Render with a PAT
   that has `read:packages`).
2. **Render** — New → Web Service → *Existing image* `ghcr.io/jovanhn/auto-journal-backend:latest`.
   Health check path `/actuator/health`. Environment variables:
   `PORT=8080` (Render routes to `PORT`; the app listens on 8080), `DB_URL` (Supabase session pooler or
   direct, `?sslmode=require`), `DB_USERNAME`, `DB_PASSWORD`, `SUPABASE_URL`, and the exchange rates if
   they differ from the defaults. `SPRING_PROFILES_ACTIVE=prod` is set in the image.
3. **Deploy hook** — Render service → Settings → Deploy Hook; store the URL as the secret
   `RENDER_DEPLOY_HOOK_URL` in the GitHub environment **production** (it is a credential: anyone with it
   can trigger deploys). Turn off Render's own auto-deploy so only CI deploys.

Rollback: in Render, redeploy a previous deploy (or set the image to an older `:<sha>` tag).

## Frontend deployment (Cloudflare)

ADR 0017. The Worker `auto-journal` serves the Vite build as static assets (`frontend/wrangler.jsonc`, SPA
fallback). Cloudflare Workers Builds builds and deploys every push to `main` itself (not GitHub Actions).

Workers Builds settings (Cloudflare dashboard → Worker → Settings → Build):

- Root directory `frontend`; build command `pnpm build`; deploy command `npx wrangler deploy`.
- Build variables: `VITE_API_BASE_URL=https://<render service>.onrender.com/api`, `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY` (inlined into the bundle at build time; publishable values only).

On Render, `CORS_ALLOWED_ORIGINS` must contain the Worker's origin (e.g.
`https://auto-journal.<account>.workers.dev`, plus any custom domain).
