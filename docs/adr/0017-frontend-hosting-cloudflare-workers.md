# 0017. Frontend hosting: Cloudflare Workers static assets, API cross-origin with CORS

- **Status:** Proposed
- **Date:** 2026-10-31

## Context

The SPA needs a host; the backend runs on Render (ADR 0016) on its own origin. Cloudflare is connected to
the repo with Workers Builds, which builds and deploys on every push.

## Decision

- The frontend is a **Cloudflare Worker with static assets only** (no Worker code), configured in
  `frontend/wrangler.jsonc`: `dist/` is served, unknown paths fall back to `index.html`
  (`not_found_handling: single-page-application`) so client-side routes work on reload.
- Cloudflare Workers Builds (dashboard config): root directory `frontend`, build command `pnpm build`,
  deploy command `npx wrangler deploy`. Wrangler is not a project dependency; `npx` fetches it at deploy.
  Build variables: `VITE_API_BASE_URL` (Render URL + `/api`), `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_PUBLISHABLE_KEY`.
- The browser calls the backend directly. The backend allows the frontend origin(s) via **CORS** on
  `/api/**` from `CORS_ALLOWED_ORIGINS` (comma-separated; empty = none). Profile `local` defaults to the
  Vite dev and preview origins, because the Vite proxy forwards the browser's `Origin` and writes would
  otherwise be rejected. Bearer tokens only, so no credentialed CORS.

## Consequences

- Deploys are owned by Cloudflare, not GitHub Actions: Cloudflare builds every push, independent of CI.
  Its check shows on PRs but is not part of `ci-ok`.
- A new frontend domain (custom domain, preview URLs) must be added to `CORS_ALLOWED_ORIGINS` on Render.
- Each API call from a new page load may need a CORS preflight (cached for 1 hour via `maxAge`).

## Alternatives considered

- **Worker proxies `/api` to Render (same origin, no CORS)** — needs Worker code and adds a hop; CORS is a
  few lines of standard config.
- **Cloudflare Pages** — Cloudflare now steers new projects to Workers static assets, and the project was
  already created as a Worker.
- **Deploy from GitHub Actions with `wrangler`** — would gate frontend deploys on CI like the backend, but
  needs a Cloudflare API token in GitHub; can be revisited.
