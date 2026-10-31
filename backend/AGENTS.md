# AGENTS.md — backend

Kotlin, Spring Boot 4, Spring Modulith, Maven (wrapper `./mvnw`), Java 17, Flyway, PostgreSQL.
See [docs/architecture.md](../docs/architecture.md) and ADRs 0003, 0004, 0005, 0010.

## Architecture standard

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

## Database access standard

> Use Spring Data JPA for module-owned persistence and `JdbcClient` for complex or
> cross-module reads. Do not introduce other database access APIs or frameworks
> without architectural approval.

## Module structure

```
com.example.autojournal                 @SpringBootApplication + @Modulithic(sharedModules = ["shared"])
  <module>/
    api/          public: interfaces + DTOs; ModuleMetadata.kt = @PackageInfo @NamedInterface("api")
    internal/
      controller/ implements generated com.example.contract.api.*Api; HTTP ↔ service via mappers; no logic, no @Transactional
      service/    business logic; owns @Transactional; calls own DAOs + other modules' api only;
                  also implements the module's public api interfaces
      dao/        write DAOs wrap own JPA repositories; read DAOs use JdbcClient (only place for cross-module JOINs)
      repository/ Spring Data JPA repositories for own entities only
      entity/     JPA entities for own tables only; other modules referenced by ID (vehicleId: UUID)
      dto/        internal DTOs          mapper/  plain Kotlin extension functions, no mapping libraries
  shared/         OPEN shared module: error handling, security (CurrentUser), money (Currency, ExchangeRates),
                  time (UTC Clock), AssignedIdEntity. No business logic.
com.example.contract                    generated (target/), outside the root → not a module. Never edit.
```

Adding a module: create `<module>/api/ModuleMetadata.kt` (copy from `vehicles`) and `<module>/internal/...`;
add an Accepted ADR only if it changes the architecture. `ModularityTests` must stay green.

## JPA vs JdbcClient

**JPA** — writes and simple reads of the module's own tables (via a write DAO):

```kotlin
@Component
class VehicleDao(private val repository: VehicleRepository) {
    // saveAndFlush: a unique-index violation surfaces inside the service (→ 409 on `nickname`), not at commit
    fun insert(vehicle: VehicleEntity): VehicleEntity = repository.saveAndFlush(vehicle)
    fun findOwned(id: UUID, ownerId: UUID): VehicleEntity? = repository.findByIdAndOwnerId(id, ownerId)
}
```

**JdbcClient** — aggregates, complex reads, or anything that JOINs another module's table (read-only),
in a dedicated read DAO of the reading module, e.g.:

```kotlin
jdbcClient.sql(
    """
    SELECT e.vehicle_id, SUM(e.amount * e.rate_to_eur) AS total_eur
    FROM autojournal.expense e JOIN autojournal.vehicle v ON v.id = e.vehicle_id
    WHERE v.owner_id = :ownerId
    GROUP BY e.vehicle_id
    """.trimIndent(),
).param("ownerId", ownerId).query { rs, _ -> ... }.list()
```

Reference implementations: `vehicles/internal/dao/VehicleDao.kt` (write DAO) and
`vehicles/internal/service/VehicleService.kt` (cross-module call through `users.api.UserProfileApi`).
Cross-module read DAO: `expenses/internal/dao/ExpenseSummaryReadDao.kt` (JOINs `vehicle`, read-only).

## Kotlin + JPA pitfalls

- Entities are regular `class`es, never `data class` (equals/hashCode/toString over lazy state break JPA).
- `kotlin-maven-allopen` + `noarg` (`spring`, `jpa`) are configured; don't add `open` or no-arg constructors by hand.
- App-generated UUID ids: extend `shared.persistence.AssignedIdEntity` (implements `Persistable`) so `save()`
  INSERTs instead of SELECT + merge.
- No cross-module JPA relationships (`@ManyToOne` etc.). Within a module, prefer IDs too unless a relation is needed.
- `open-in-view` is off: load everything you need inside the service transaction; return mapped DTOs.
- JdbcClient SQL is schema-qualified (`autojournal.<table>`); Hibernate uses `default_schema`.
- Hibernate only validates the schema (`ddl-auto=validate`) — every entity change needs a migration.

## Migrations

- `src/main/resources/db/migration/V<n>__<snake_case_description>.sql`, next free integer, e.g.
  `V4__create_expense.sql`. **Never edit an applied migration.**
- Unqualified names land in the `autojournal` schema. Never create objects in `public`.
- Every `CREATE TABLE` is followed by `ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;` (no policies).
- Comment which module owns each new table, and update [docs/domain/entities.md](../docs/domain/entities.md).

## Error handling

`shared/error/GlobalExceptionHandler` renders RFC 9457 `ProblemDetail` as defined in the contract:

| Situation                                   | Throw / source                        | Status |
| ------------------------------------------- | ------------------------------------- | ------ |
| Bean validation (body, params), bad JSON    | framework                             | 400 + `errors[{field,message}]` |
| Input only the server can check (e.g. a date against today) | `InvalidRequestException(fieldErrors)` | 400 + `errors` |
| Resource missing (or another user's)        | `NotFoundException`                   | 404    |
| Business rule violated                      | `DomainRuleViolationException(msg, fieldErrors)` | 409 (+ `errors` if field-related) |

Use field errors whose `field` matches the request property so the frontend can show them on the form field.

## Testing

- JUnit 5, MockK (unit), Spring Boot Test, Testcontainers PostgreSQL. **No H2.**
- `@IntegrationTest` (full context + MockMvc + Testcontainers) for API and DAO integration tests; clean data
  with `jdbcClient.truncateAll()` in `@BeforeEach`.
- Required: `ModularityTests`; an integration test for every cross-module read DAO; API integration tests per module.
- Test names describe behavior in backticks; write them from the spec's acceptance criteria.
- Docker must be running (Testcontainers).

## Commands

| Command (in `backend/`)                 | What                                              |
| --------------------------------------- | ------------------------------------------------- |
| `./mvnw verify`                         | Compile, generate, all tests, Modulith, ktlint    |
| `./mvnw generate-sources`               | Regenerate contract interfaces (`make gen`)       |
| `./mvnw spring-boot:run`                | Run locally (profile `local`; `make db-up` first) |
| `./mvnw ktlint:format`                  | Auto-format Kotlin                                |
| `./mvnw test -Dtest=ModularityTests`    | Module boundary check only                        |

## Deployment

Production runs `backend/Dockerfile` on Render, deployed by `ci.yml` after every green `main` that touches
`backend/**` or `contracts/**` (ADR 0016; details in
[docs/operations.md#deployment](../docs/operations.md#deployment)).

- Profile `prod` (set in the image) reads env vars only. A new property without a default must be set on
  Render **before** the merge, or the app fails to start; add it to `application*.yml`, `.env.example` and
  the env var tables in `docs/operations.md`.
- New Flyway migrations run against the production Supabase database at the next startup; write them to be
  safe with existing data (no destructive changes without a plan).
- A new endpoint path outside `/api` gets no CORS (`SecurityConfig`); keep the API under `/api`.
- Check a deploy with the Render MCP (`list_deploys`, `list_events`, `list_logs` for service
  `srv-dbiu9vg473hc73alkesg`) and `curl https://be-autojournal.skverly.com/actuator/health`.
- `docker build -f backend/Dockerfile .` from the repo root reproduces the production image.
