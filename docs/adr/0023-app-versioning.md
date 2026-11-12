# 0023. App versioning: per-component SemVer from git tags

- **Status:** Accepted
- **Date:** 2026-11-12

## Context

The owner could not tell which build was running: `GET /api/status` returned only the backend's commit SHA,
and the frontend had no version at all. Every merge to `main` is a production release (ADR 0016, ADR 0022),
there is no staging, and since ADR 0022 both apps are built in `ci.yml`, each only when its path filter
matched. specs/app-versioning.md asks for a readable version plus build metadata for both apps.

## Decision

- **Two independent streams**, `frontend` and `backend`, each SemVer `MAJOR.MINOR.PATCH`. They are never
  compared; the API contract governs compatibility.
- **Annotated tags `<component>/vX.Y.0` set MAJOR.MINOR; PATCH counts the commits since the newest tag**
  (`git describe --tags --long --match '<component>/v*'`). `main` builds are `X.Y.N`, other refs
  `X.Y.N-dev`, builds without tags `0.0.0-local`. One script, `scripts/version.sh <component>`, computes it.
  Tags never trigger builds; `scripts/tag-release.sh` creates and pushes one. Nothing is bumped from
  commit messages. Initial tags: `frontend/v1.0.0`, `backend/v1.0.0`.
- **Build metadata** (`component`, `version`, `gitSha`, `buildId`, `buildTime`) is fixed when the artifact is
  built: Docker build args → env vars → `autojournal.build.*` for the backend, exposed through the contract's
  `ServiceStatus` (not Actuator); a Vite `define` (`__BUILD_INFO__`) for the frontend.
- **Guardrail:** `backend-image` and `frontend-deploy` check out the full history and set
  `RELEASE_BUILD=true`; the build fails instead of shipping a `-dev` or `0.0.0-local` version.
- The backend image is also tagged `:<version>`; Render keeps deploying `:<sha>`.
- The Settings page shows both versions in a footer unless the frontend is built with
  `VITE_SHOW_BUILD_INFO=false`.

## Consequences

- Every production deploy has a unique, increasing version without tag pushes or rebuilds. PATCH skips
  numbers for commits that did not touch the component; that is accepted.
- `ServiceStatus.version` changed meaning (SHA → SemVer, SHA moved to `gitSha`); the wake-up protocol only
  checks the JSON shape.
- Production delivery now depends on tags being present: deleting all tags of a component would stop its
  deploys (with a clear error). Tags are never moved or deleted.
- Re-running a CI job gives the same version and a new `buildId`; `:<version>` is overwritten by an image of
  the same commit.

## Alternatives considered

- **`X.Y.Z` only from a tagged release build, `main` = `X.Y.Z-dev.N`** — every production deploy would carry
  a `-dev` label, because every `main` build goes to production.
- **One shared version for both apps** — would bump a component that did not change and suggests a
  compatibility that the contract, not the number, provides.
- **Spring Actuator `/info`, Maven `${revision}`, git-commit plugins** — more moving parts for the same data;
  `/api/status` is already public, contract-first and free of secrets.
- **Keep `version` = SHA and add `appVersion`** — non-breaking but leaves a misleading field name.
