# 0002. Contract-first OpenAPI with code generation

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Backend and frontend must agree on paths, payloads, validation limits, and error shapes. Hand-written
duplicates drift, especially when several agents change code in parallel.

## Decision

- `contracts/openapi.yaml` (OpenAPI 3.0.3, for generator compatibility) is the single source of truth for
  the HTTP API, linted with Redocly CLI.
- The backend generates Spring interfaces and models with `openapi-generator-maven-plugin`
  (`kotlin-spring`, `interfaceOnly`, bean validation, Spring Boot 4 / Jackson 3) into
  `target/generated-sources` in package `com.example.contract` (outside the Modulith root). Controllers
  implement the generated interfaces.
- The frontend generates TanStack Query hooks and Zod schemas with Orval into
  `src/shared/api/generated/` (gitignored), before dev, build, and test.
- Generated code is never committed and never edited. API changes start in the contract, then `make gen`.
- Errors use RFC 9457 `ProblemDetail` with optional field `errors`; lists use `{ items, page, size, totalItems }`.

## Consequences

- Compile errors surface contract/implementation drift immediately on both sides.
- Breaking contract changes require explicit approval (contracts/AGENTS.md).
- Generator upgrades can change generated code shape; review them like any dependency upgrade.

## Alternatives considered

- **Code-first (springdoc generates the spec)** — the frontend would depend on a built backend and the
  contract would follow implementation details.
- **Hand-written clients/DTOs** — drift and duplicated validation rules.
