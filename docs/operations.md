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
| `VITE_API_BASE_URL`      | frontend (build) | `/api`                                          | URL of the backend `/api`     |
| `SUPABASE_URL`           | backend          | project URL (from `.env`)                       | project URL (JWT issuer `<url>/auth/v1`) |
| `VITE_SUPABASE_URL`      | frontend (build) | project URL                                     | project URL                   |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend (build) | project publishable key                  | project publishable key       |
| `EXCHANGE_RATE_RSD_PER_EUR`, `EXCHANGE_RATE_USD_PER_EUR` | backend | `117.00`, `1.10`              | set by the owner (ADR 0014)   |
| `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` | e2e | test user in the Supabase project               | CI secrets only               |

The Supabase and E2E variables are planned (specs/auth.md, ADR 0015) and are wired into the apps when auth
is implemented.

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
