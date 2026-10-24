# autojournal — developer entry points. `make check` runs exactly what CI runs.
# Requires: Docker, JDK 17, Node (see frontend/.nvmrc) with corepack/pnpm, GNU make, a POSIX shell.

SHELL := /bin/sh
MVNW  := ./mvnw
PNPM  := pnpm

.DEFAULT_GOAL := help

.PHONY: help db-up db-down install gen contracts-lint be-run be-test be-check \
        fe-install fe-gen fe-run fe-test fe-check e2e-install e2e lint test check

help: ## List targets
	@grep -E '^[a-zA-Z0-9_-]+:.*## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*## "}; {printf "  %-16s %s\n", $$1, $$2}'

# --- Database ---------------------------------------------------------------

db-up: ## Start local Postgres and wait until healthy
	docker compose up -d --wait postgres

db-down: ## Stop local Postgres (data volume is kept)
	docker compose down

# --- Install / code generation ---------------------------------------------

install: ## Install all Node dependencies (contracts, frontend, e2e)
	cd contracts && $(PNPM) install --frozen-lockfile
	cd frontend && $(PNPM) install --frozen-lockfile
	cd e2e && $(PNPM) install --frozen-lockfile

gen: ## Generate backend interfaces and frontend client from contracts/openapi.yaml
	cd backend && $(MVNW) -q generate-sources
	cd frontend && $(PNPM) install --frozen-lockfile && $(PNPM) gen

# --- Contracts --------------------------------------------------------------

contracts-lint: ## Lint the OpenAPI spec with Redocly
	cd contracts && $(PNPM) install --frozen-lockfile && $(PNPM) lint

# --- Backend ----------------------------------------------------------------

be-run: ## Run the backend against local Postgres (make db-up first)
	cd backend && $(MVNW) spring-boot:run

be-test: ## Backend unit + integration tests, Modulith verification, ktlint
	cd backend && $(MVNW) -B verify

be-check: be-test ## Backend CI checks

# --- Frontend ---------------------------------------------------------------

fe-install:
	cd frontend && $(PNPM) install --frozen-lockfile

fe-gen: fe-install
	cd frontend && $(PNPM) gen

fe-run: fe-install ## Run the frontend dev server (proxies /api to :8080)
	cd frontend && $(PNPM) dev

fe-test: fe-install ## Frontend unit/component tests
	cd frontend && $(PNPM) test

fe-check: fe-gen ## Frontend CI checks: lint, typecheck, test, build
	cd frontend && $(PNPM) lint && $(PNPM) typecheck && $(PNPM) test && $(PNPM) build

# --- E2E --------------------------------------------------------------------

e2e-install:
	cd e2e && $(PNPM) install --frozen-lockfile && $(PNPM) exec playwright install chromium

e2e: e2e-install fe-gen ## Playwright critical flows against the full local stack (builds both apps first)
	cd backend && $(MVNW) -B -q -DskipTests package
	cd frontend && $(PNPM) build
	cd e2e && $(PNPM) test

# --- Aggregates -------------------------------------------------------------

lint: contracts-lint fe-gen ## All linters (Redocly, ESLint, Prettier, tsc, ktlint)
	cd frontend && $(PNPM) lint && $(PNPM) typecheck
	cd backend && $(MVNW) -B ktlint:check

test: be-test fe-test ## All unit and integration tests

check: contracts-lint be-check fe-check e2e ## Exactly what CI runs
