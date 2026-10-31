# 0016. Backend delivery: Docker image on GHCR, deployed to Render

- **Status:** Proposed
- **Date:** 2026-10-31

## Context

The backend needs a production host. Render runs Docker images, either built by Render from the repo or
pulled from a registry. We want to deploy only code that has passed the full CI gate (ADR 0009), and to know
exactly which commit is running. The frontend is hosted separately (Cloudflare) and is out of scope here.

## Decision

- `backend/Dockerfile` (multi-stage, build context = repo root because the build generates code from
  `contracts/openapi.yaml`): JDK 17 build stage runs `mvnw package -DskipTests`; the JRE 17 runtime stage
  uses Spring Boot layered extraction, runs as a non-root user, and defaults to `SPRING_PROFILES_ACTIVE=prod`.
- Images go to **GitHub Container Registry**: `ghcr.io/jovanhn/auto-journal-backend:<commit sha>` plus
  `:latest`. CI pushes with the built-in `GITHUB_TOKEN` (`packages: write` on that job only). The package is
  public, so Render pulls without credentials.
- In `ci.yml`, on `push` to `main` only, when the backend filter matched and `ci-ok` succeeded:
  `backend-image` builds and pushes, then `backend-deploy` (GitHub environment `production`) calls the Render
  deploy hook with `imgURL=<sha-tagged image>`. These jobs are not in `ci-ok.needs`.
- Plain `docker` CLI on the runner; no Docker actions added. Dependabot updates the Dockerfile base images.

## Consequences

- Every deploy is a tested commit, and the running image tag is its sha; rollback = redeploy an older tag
  in Render.
- Configuration lives in Render env vars (see operations.md); the image contains no secrets.
- The image build downloads Maven dependencies every time (no layer cache between runners), roughly a minute.
- If the `production` environment has required reviewers, each backend deploy waits for approval.

## Alternatives considered

- **Render builds the Dockerfile from the repo** — no registry, but Render would deploy on push regardless
  of CI results, and the image would not be reusable elsewhere.
- **Docker Hub** — needs a separate account and token; GHCR comes with the repo.
- **`spring-boot:build-image` (Buildpacks)** — no Dockerfile, but slower, larger, and less transparent.
