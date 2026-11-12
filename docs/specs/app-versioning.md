# Spec: App versioning

## Status

Implemented — release **v13 (app versioning)**

## Goal

Every production build of the frontend and the backend gets a readable version and a commit SHA, so the
owner can tell exactly what is running. The two have separate version numbers. A small footer on the
Settings page shows both, unless the frontend deploy turns it off.

Adapted from a generic monorepo versioning spec, to fit how this repo already ships:

- A merge to `main` is a release (ADR 0016, ADR 0022). There is no staging, no preview environment and no
  promotion step.
- After specs/frontend-delivery.md, both apps are built and deployed by `ci.yml` (`backend-image`,
  `frontend-deploy`) on `main` after `ci-ok`, only when their path filter matched.
- `GET /api/status` already returns the backend's commit SHA as `version`.

Depends on: specs/frontend-delivery.md (blocking), specs/auth.md (Settings page), specs/assistant-mcp.md
(`/api/status`). Needs an ADR (0023) for the versioning scheme.

## User stories

- As the owner, I want to see which frontend and backend version is running, so that I can tell whether
  a merge reached production and report bugs against the right build.
- As the owner, I want to copy the full build details, so that I can paste them into an issue or a chat
  with an agent.

## Business rules

None. This is build metadata, not domain behavior.

## Decisions

1. **Two version streams, one scheme.** The `frontend` and `backend` components each use SemVer
   `MAJOR.MINOR.PATCH`. Their numbers are independent and are never compared. The API contract governs
   compatibility, not version equality.
2. **Tags set MAJOR.MINOR; PATCH counts commits.** Each component has annotated tags `frontend/vX.Y.0` /
   `backend/vX.Y.0`. A build computes
   `git describe --tags --match '<component>/v*' --abbrev=0` plus the number of commits since that tag:
   - commit on `main`, N commits after `frontend/v1.2.0` → `1.2.N` (N = 0 on the tagged commit itself)
   - any other branch (PR, local with tags) → `1.2.N-dev`
   - no git or no matching tag (for example, a zip download) → `0.0.0-local`

   Every production deploy gets a clean, unique and increasing version, with no tag push and no
   rebuild. To start a new minor or major, the owner tags `main` (for example, `backend/v1.3.0`) with
   `scripts/tag-release.sh <component> <MAJOR.MINOR>` (an annotated tag on `origin/main`, pushed). The tag
   only changes the numbering of the next build; it never triggers a build. Releases and versions are
   never bumped from commit messages.

   *This differs from the source spec* (`X.Y.Z` only from a release tag; `main` builds as
   `X.Y.Z-dev.<run>`). Here every `main` build goes to production, so a `-dev` label would end up on
   every production build.
3. **Initial tags:** `frontend/v1.0.0` and `backend/v1.0.0` on the last `main` commit before this spec
   merges, pushed before the merge (the merge's own production builds need them, decision 9; a rebase
   merge creates new SHAs, so the shipping commit cannot be tagged in advance). The first versioned
   deploys are therefore `1.0.N`, N = the number of commits this spec adds. Global `v*` tags are not used.
4. **One script computes the version:** `scripts/version.sh <component>` prints the version. The
   `backend-image` job and the Vite build (in `frontend-deploy` and locally) both call it. `make version`
   prints both.
5. **Build metadata** (same shape for both components):

   | Field       | Value                                                                       |
   | ----------- | --------------------------------------------------------------------------- |
   | `component` | `frontend` or `backend`                                                     |
   | `version`   | per decision 2                                                              |
   | `gitSha`    | full commit SHA, or `local`                                                 |
   | `buildId`   | `GITHUB_RUN_ID-GITHUB_RUN_ATTEMPT` in CI; `local` otherwise                 |
   | `buildTime` | UTC ISO 8601 build time                                                     |

   The metadata is fixed when the artifact is built. Nothing changes it at runtime.
6. **Backend exposure through `/api/status`, not Actuator.** `/api/status` is already public, contract-first
   and free of secrets. The `ServiceStatus` schema gains the fields from decision 5. Actuator keeps
   exposing only `health`.
7. **Backend wiring:** CI passes `APP_VERSION`, `GIT_SHA`, `BUILD_ID` and `BUILD_TIME` as Docker build
   args (they replace today's `APP_VERSION=$GITHUB_SHA`). They become env vars in the image and are read
   through `autojournal.build.*` properties with local defaults. The GHCR image is also tagged
   `:<version>` (next to `:<sha>` and `:latest`). The Maven `<version>` and Maven `build-info` / git
   plugins stay unchanged.
8. **Frontend wiring:** `vite.config.ts` runs the script at build time and uses `define` to inline a
   typed `BUILD_INFO` constant (`src/shared/buildInfo.ts`). No runtime configuration. In CI the SHA comes
   from `GITHUB_SHA`, locally from `git`.
8a. **Visibility flag `VITE_SHOW_BUILD_INFO`** (build time, frontend only). The build-info footer is
   hidden only when the value is exactly `false`; unset or any other value shows it. Production reads
   it from the GitHub environment `production` variables (`frontend-deploy`); changing it needs a
   redeploy (re-run `frontend-deploy`, ADR 0022 decision 5). The flag only hides the UI: `BUILD_INFO` is
   still in the bundle and `/api/status` still returns the backend's metadata.
9. **Guardrail:** a production build fails if the version is `0.0.0-local` or contains `-dev`. A
   production build is the `backend-image` or `frontend-deploy` job; both set `RELEASE_BUILD=true`, which
   makes `scripts/version.sh` fail instead of printing a fallback. Local, test and PR builds accept
   fallback values.
10. **Change detection is unchanged.** CI path filters (ADR 0009) already build each component
    independently, and after specs/frontend-delivery.md they also deploy each one independently. A
    frontend-only change does not rebuild or redeploy the backend, and the reverse also holds. PATCH
    counts every commit since the tag, so it skips numbers for commits that did not touch the component.
11. **Rollback:** this works as it does today. In Render, redeploy an earlier deploy or an older
    `:<sha>`/`:<version>` image. In Cloudflare, roll back to an earlier deployment. The rolled-back
    artifact keeps its original metadata, because the metadata is part of the artifact.

## Acceptance criteria

1. **Version computation**
   - Given `frontend/v1.0.0` on commit A and 3 later commits on `main`
   - When `scripts/version.sh frontend` runs on `main` HEAD
   - Then it prints `1.0.3`; on commit A it prints `1.0.0`; on a branch commit 3 commits after A it prints
     `1.0.3-dev`; in a clone without matching tags it prints `0.0.0-local`
2. **Independent streams**
   - Given `frontend/v1.0.0` and `backend/v2.1.0`
   - Then each component's version uses only its own tags
3. **Backend status**
   - Given a backend image built by CI on `main`
   - When I call `GET /api/status` (no token)
   - Then the response has `status`, `startedAt`, `component: backend`, the semver `version`, the full
     `gitSha`, `buildId` and `buildTime`; no other build or environment data
4. **Backend local fallback**
   - Given the backend runs locally without build args
   - Then it starts, and `/api/status` returns `version: 0.0.0-local`, `gitSha: local` and
     `buildId: local`
5. **Frontend build info**
   - Given a frontend build
   - Then `BUILD_INFO` has the five fields of decision 5, inlined at build time
6. **Settings footer shows both versions**
   - Given I am signed in, `VITE_SHOW_BUILD_INFO` is not `false`, and I open Settings
   - Then a footer at the bottom of the page shows `Frontend <version> · <short sha> · <build date>` and
     the same for the Backend, taken from `/api/status`
   - And no other page shows version info
6a. **Footer turned off**
   - Given the frontend was built with `VITE_SHOW_BUILD_INFO=false`
   - When I open Settings
   - Then no build-info footer is shown and `/api/status` is not called
7. **Backend unavailable**
   - Given `/api/status` is loading, fails, times out or returns an unexpected body
   - Then the frontend row still shows; the Backend row shows "Checking…" while loading, then
     "Unavailable"; nothing suggests the versions match
8. **Copy build details**
   - When I tap "Copy"
   - Then both components' full metadata (all fields, full SHAs) is copied to the clipboard as text
9. **Production guardrail**
   - Given a production build (decision 9) whose version would be `0.0.0-local` or `-dev`
   - Then the build fails with a message naming the missing tag or git history
10. **Image tags**
    - Given a backend deploy from `main`
    - Then GHCR has the image under `:<sha>`, `:<version>` and `:latest`, and Render deploys `:<sha>`

## Edge cases

- **Shallow clone:** `actions/checkout` fetches depth 1 without tags by default, so `backend-image` and
  `frontend-deploy` need `fetch-depth: 0`. If the clone has no tags, a production build fails (AC 9)
  instead of shipping `0.0.0-local`.
- **Re-running a CI job** on the same commit gives the same `version` and `gitSha` and a new `buildId`.
  The `:<version>` image tag is overwritten by an image built from the same commit, which is acceptable
  here.
- **Two tags on the same commit for one component:** `git describe` picks the newest. Tags are never moved
  or deleted.
- Frontend loaded from the browser cache shows the bundle actually running in the browser, which is the
  intended behavior. A stale tab shows an older frontend version than the one deployed.

## API impact

`ServiceStatus` (`GET /api/status`):

- **Changed meaning:** `version` goes from the commit SHA to the semver version. Only the wake-up
  protocol reads this endpoint, and it checks only the JSON shape. **Approved** by the owner
  (2026-11-12).
- **New required fields:** `component` (string, `backend`), `gitSha`, `buildId`, `buildTime`
  (date-time).

## UI notes

- Settings page only: a quiet footer (`<footer>`, small muted text, no card) below the Account card.
  Settings has no board on the design canvas; use design tokens.
- Two lines (Frontend, Backend): version in the body font, short SHA (7 characters) in mono, build date
  (local date). A small "Copy" button (lucide `Copy`) with a toast "Copied".
- Backend data comes from a feature hook that wraps the generated `getStatus` query. It does not retry
  for long and does not run the wake-up protocol: if the backend is asleep, the row shows "Unavailable".
- No version in the header or navigation.

## E2E

- none (unit tests for the script; backend controller test; frontend component tests for the About
  section's states)

## Out of scope

- Release tags that trigger builds, release workflows, preview environments and promotion of one artifact
  across environments (production is the only environment).
- Deployment records beyond what Render, GHCR and Cloudflare already keep. Image digests are not stored.
- Spring Actuator `/info`, Maven `${revision}` / `build-info` / git-commit plugins.
- Automatic bumps from commit messages, a shared frontend+backend version, and compatibility checks based
  on version numbers.
- Version info in MCP tool responses.

## Open questions

None. Answered by the owner (2026-11-12): decision 2 (every `main` build is a release, PATCH = commits
since the tag) is approved; the `version` meaning change in `ServiceStatus` is approved; both components
start at `1.0.0`; version info appears only in a footer on Settings, controlled by `VITE_SHOW_BUILD_INFO`
(decision 8a).
