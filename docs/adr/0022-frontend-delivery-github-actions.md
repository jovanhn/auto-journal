# 0022. Frontend delivery: built and deployed by GitHub Actions, hosted on Cloudflare

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

ADR 0017 let Cloudflare Workers Builds build and deploy the frontend on every push to `main`. That
deploy did not depend on CI: a red build could reach production, and a backend-only merge redeployed the
frontend. The frontend was also built outside GitHub Actions, so it had no run id or SHA from the same
pipeline as the backend, which app versioning (specs/app-versioning.md) needs. ADR 0017 already named
"deploy from GitHub Actions with `wrangler`" as the alternative.

## Decision

- Supersedes ADR 0017 **for delivery only**. Hosting stays the same: Cloudflare Worker `auto-journal`,
  static assets only, `frontend/wrangler.jsonc`, custom domain `autojournal.skverly.com`, CORS to the
  backend.
- `ci.yml` job `frontend-deploy` runs on push to `main` when the `frontend` filter matched and `ci-ok`
  succeeded (the same conditions as `backend-image`). It is not part of `ci-ok`. It uses GitHub
  environment `production`, builds with `pnpm build`, and deploys with
  `npx --yes wrangler@<pinned> deploy`. Wrangler stays out of the project's dependencies, and no
  third-party deploy action is added. The pin is updated by hand.
- Configuration lives in the `production` environment: secret `CLOUDFLARE_API_TOKEN` (custom token,
  *Workers Scripts: Edit* on the account) and variables `CLOUDFLARE_ACCOUNT_ID`, `VITE_API_BASE_URL`,
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. The job fails before building if any of them
  is missing.
- Workers Builds is disconnected from the repository. Cloudflare builds nothing.
- `.github/workflows/ci.yml` is part of the `backend`, `frontend` and `e2e` path filters. A CI change is
  verified by the jobs it configures, and on `main` it redeploys both apps.

## Consequences

- Only a commit that passed CI reaches production, for both apps. A backend-only merge no longer
  redeploys the frontend.
- Both apps are built in one pipeline with the same SHA and run id, which app versioning builds on.
- The Cloudflare PR check ("Workers Builds: auto-journal") is gone. CI still builds the frontend on PRs.
- Redeploying without a code change means re-running `frontend-deploy` of the latest `main` run.
  Rollback goes through the Cloudflare dashboard (Worker → Deployments) or `wrangler rollback`.
- The API token is a long-lived credential in GitHub; it can only edit Workers scripts on this account.
- Changes to `ci.yml` cost a full CI run and a redeploy of both apps.

## Alternatives considered

- **Keep Workers Builds** — no CI gate and no shared build metadata.
- **`cloudflare/wrangler-action`** — one more third-party action to trust and update, for what one
  `npx` line does.
- **Build in the `frontend` job and deploy its artifact** — that job builds without production values on
  PRs as well. A separate production build in the deploy job is simpler.
