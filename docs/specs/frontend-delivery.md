# Spec: Frontend delivery from GitHub Actions

## Status

Implemented — release **v12 (frontend delivery)**

## Goal

GitHub Actions builds the frontend and deploys it to Cloudflare. Cloudflare only hosts it: the Worker,
static assets and custom domain stay as they are, but Workers Builds stops building. Frontend deploys then
follow the backend's path (ADR 0016): only a commit that passed CI goes to production, and only when the
frontend changed. Both apps then build in one place, which specs/app-versioning.md needs.

Changes ADR 0017 (a new ADR, 0022, supersedes its delivery part). Blocks: specs/app-versioning.md.

## User stories

- As the owner, I want the frontend deployed only after CI is green, so that a failing build or test never
  reaches production.
- As the owner, I want a backend-only merge not to redeploy the frontend, so that each deploy matches a
  real change.
- As the owner, I want both apps built and deployed by one workflow, so that versioning and deploy history
  live in one place.

## Business rules

None. This is delivery infrastructure.

## Decisions

1. **New job `frontend-deploy` in `ci.yml`.** Same conditions as `backend-image`: push to `main`,
   `needs: [changes, ci-ok]`, `!cancelled() && needs.ci-ok.result == 'success'`, and the `frontend` path
   filter matched (`frontend/**`, `contracts/**` or `.github/workflows/ci.yml`). It is not part of `ci-ok`. It uses GitHub environment
   `production` (no required reviewers, like the backend).
2. **The job builds with production values and deploys that output:** checkout → pnpm/node setup →
   `pnpm install --frozen-lockfile` → `pnpm gen` → `pnpm build` → `npx --yes wrangler@<pinned exact
   version> deploy` in `frontend/`. Deployment uses the existing `frontend/wrangler.jsonc` without
   changes. Wrangler stays out of the project's dependencies, and no third-party deploy action is added
   (the same approach as plain `docker` in ADR 0016). The pinned version lives in `ci.yml` and is updated
   by hand (Dependabot does not see it).
3. **Configuration in the GitHub environment `production`:**

   | Name                            | Kind     | Value                                          |
   | ------------------------------- | -------- | ---------------------------------------------- |
   | `CLOUDFLARE_API_TOKEN`          | secret   | API token, permission *Workers Scripts: Edit* on the account only |
   | `CLOUDFLARE_ACCOUNT_ID`         | variable | Cloudflare account id                          |
   | `VITE_API_BASE_URL`             | variable | `https://be-autojournal.skverly.com/api`       |
   | `VITE_SUPABASE_URL`             | variable | `https://dnkgfohtcbidlzjivkkl.supabase.co`     |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | variable | the publishable key (not a secret)             |

   The owner creates the token; with the owner's permission they were copied from the local `.env` into
   GitHub without being shown. The Workers Builds
   build variables in Cloudflare are no longer used.
4. **Ordering:** pushes to `main` already queue rather than cancel (`ci.yml` concurrency), so frontend
   deploys run in commit order, like backend deploys.
5. **Redeploy without a code change** (for example, after changing a `VITE_*` variable): re-run the
   `frontend-deploy` job of the latest `main` run in GitHub. No new trigger.
6. **Rollback:** the Cloudflare dashboard (Worker → Deployments) or `wrangler rollback`. A re-run of an
   older run's `frontend-deploy` job also works, but it rebuilds from that commit.
7. **Cutover** (as done, 2026-11-12):
   1. The owner created the token; the GitHub environment values were set (decision 3).
   2. The owner disconnected the Git repository in Workers Builds before the merge, so from then until
      the merge nothing deployed the frontend. The Worker, its assets, custom domain and deployment history
      stayed.
   3. The merge changes `ci.yml`, which is in the `frontend` filter (decision 8), so the merge itself runs
      `frontend-deploy`. Check that the job is green and that the site serves the new deployment.

   Fallback: reconnect the repo in Workers Builds (its settings are documented in ADR 0017).
8. **CI changes run everything:** `.github/workflows/ci.yml` is added to the `backend`, `frontend` and `e2e`
   filters, so a change to the pipeline is verified by the jobs it configures, and on `main` it redeploys
   both apps.

## Acceptance criteria

1. **Frontend change deploys after green CI**
   - Given a merge to `main` that changes `frontend/**`
   - When CI passes
   - Then `frontend-deploy` builds the frontend and deploys it, and https://autojournal.skverly.com serves
     the new build (SPA routes still work on reload)
2. **Red CI does not deploy**
   - Given a merge to `main` whose CI fails (`ci-ok` not successful)
   - Then `frontend-deploy` does not run
3. **Backend-only change does not deploy the frontend**
   - Given a merge that changes only `backend/**` (or only `docs/**`)
   - Then `frontend-deploy` is skipped
4. **Contract change deploys both**
   - Given a merge that changes `contracts/**`
   - Then both `backend-deploy` and `frontend-deploy` run
5. **Pull requests never deploy**
   - Given a pull request
   - Then `frontend-deploy` is skipped
6. **Production values are used**
   - Given the deployed frontend
   - Then it calls `https://be-autojournal.skverly.com/api` and signs in with the production Supabase
     project (it was built with the `production` environment values, not local defaults)
7. **Missing configuration fails visibly**
   - Given the token or a `VITE_*` value is missing
   - Then `frontend-deploy` fails with a clear message before deploying, and production is unchanged
8. **One deployer**
   - After cutover step 2, a push to `main` triggers no Workers Builds build

## Edge cases

- **Missing `VITE_*` value:** a build without `VITE_API_BASE_URL` would quietly point at a wrong URL. The
  job checks that the three values are set before building (AC 7).
- **A frontend deploy fails after the backend deployed** (contract change): the backend is live with the
  old frontend. This can already happen today, and contract changes must stay backward compatible (ADR
  0002). Re-run the job.
- **Re-running an old run** deploys an old build. That is the intended rollback path (decision 6), so
  no guard against it.

## API impact

None.

## UI notes

None.

## E2E

- none (pipeline change; verified by the cutover checks in decision 7)

## Out of scope

- Preview deployments for PRs (the Workers Builds PR check goes away; CI still builds the frontend on PRs).
- Staging environments and promotion.
- Moving hosting off Cloudflare, or putting Worker code in front of the assets.
- Versioning the build: specs/app-versioning.md, after this spec.

## Docs to update

- ADR 0022 (frontend delivery from GitHub Actions), and ADR 0017's Status line set to superseded in part.
- `docs/operations.md`, Deployment → Frontend: flow, GitHub environment values, rollback, cutover state.
- Root `AGENTS.md` deployment table: frontend "deployed by" `ci.yml`.

## Open questions

None. The token scope (*Workers Scripts: Edit* on the account) was accepted when the owner created it.
