# 0003. Kotlin + Spring Boot, package-by-module (modular monolith)

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

The backend should be simple to deploy and operate, yet keep domain areas decoupled so that agents can
change one module without breaking others, and so modules could be extracted later if ever justified.

## Decision

Kotlin, Spring Boot, Maven, Spring Modulith. The architecture standard:

> * Architecture: Modular monolith using Spring Boot, Kotlin, and Spring Modulith. One
>   application, one deployment, and one shared PostgreSQL database.
> * Module organization: Organize packages by business domain, not by technical layer.
> * Internal structure: Each module follows the existing layered architecture:
>   `controller → service → dao → repository → entity`, with `dto` and `mapper`
>   packages where needed.
> * Public API: Expose cross-module functionality through explicitly defined interfaces
>   and DTOs in the module's `api` package. Keep implementation details in `internal`.
> * Module boundaries: Modules must not directly access other modules' internal
>   services, repositories, or entities. Business operations must go through the owning
>   module's public API.
> * Database ownership: Each module owns its tables and write operations. Read-only
>   cross-module SQL JOINs are permitted through `JdbcClient` in dedicated read DAOs.
> * Transactions: Service layer owns transaction boundaries and business orchestration.
> * Simplicity: Prefer synchronous module communication. Avoid unnecessary
>   abstractions, events, and microservice patterns unless justified by a concrete
>   requirement.
> * Enforcement: Use Spring Modulith verification tests to validate module dependencies
>   and integration tests for cross-module database queries.

Implementation details:

- Root `com.example.autojournal` is `@Modulithic(sharedModules = ["shared"])`. Each module's `api` package
  is a Spring Modulith named interface, declared with `@PackageInfo @NamedInterface("api")` on a Kotlin
  class (Kotlin has no `package-info.java`). Everything under `internal` is module-private.
- `shared` is an OPEN shared module for cross-cutting infrastructure only (no business logic).
- Only the Modulith core and test starters are used — no event publication registry (simplicity rule).
- `ModularityTests` runs `ApplicationModules.of(...).verify()` in every build.

## Consequences

- Module boundary violations fail the build.
- Cross-module reads that need joins are explicit read DAOs, tested against real Postgres.
- One deployable keeps operations simple; modules share one database and one transaction manager.

## Alternatives considered

- **Package-by-layer** — couples domains through shared layers; boundaries cannot be verified.
- **Microservices** — operational overhead without a concrete scaling or team requirement.
