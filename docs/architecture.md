# Architecture

autojournal is a task board: projects contain tasks. It is a monorepo with a Kotlin/Spring Boot
modular-monolith backend, a React SPA frontend, and a contract-first OpenAPI spec between them.

```
contracts/openapi.yaml ──(openapi-generator)──▶ backend: Spring interfaces + models (target/, not committed)
                       └─(Orval)──────────────▶ frontend: TanStack Query hooks + Zod schemas (gitignored)
```

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

## Module map (backend)

Root package `com.example.autojournal` (`@Modulithic`). Generated contract code lives in
`com.example.contract`, outside the root, so Modulith does not treat it as a module.

| Module     | Responsibility                       | Public API (`api` named interface) | Owns tables | Depends on      |
| ---------- | ------------------------------------ | ---------------------------------- | ----------- | --------------- |
| `projects` | Projects; project summaries          | `ProjectApi`, `ProjectRef`         | `project`   | `shared`        |
| `tasks`    | Tasks within a project               | — (none needed yet)                | `task`      | `projects::api`, `shared` |
| `users`    | User profile (display currency); `GET/PATCH /api/me` | — (none needed yet) | `user_profile` | `shared` |
| `shared`   | Error handling, paging, entity base, security (JWT resource server), `Currency` | open module (all packages visible) | —           | —               |

All tables live in the `autojournal` schema. Database-level foreign keys across modules are allowed
(`task.project_id → project.id`); JPA relationships across modules are not.

Reference examples in the code:

- **Cross-module read:** `projects/internal/dao/ProjectSummaryReadDao` — `JdbcClient` query that
  read-only JOINs the `tasks` module's `task` table to compute task counts.
- **Cross-module call:** `tasks/internal/service/TaskService` — checks that a project exists through
  `projects.api.ProjectApi`, never through the projects repository.

## Request flow

```mermaid
sequenceDiagram
    participant B as Browser (React)
    participant V as Vite dev server / static host
    participant C as Controller (implements generated *Api)
    participant S as Service (@Transactional)
    participant P as Other module's api (ProjectApi)
    participant D as DAO
    participant DB as PostgreSQL (schema autojournal)

    B->>V: fetch /api/projects/{id}/tasks (generated Orval hook → http.ts)
    V->>C: proxy /api → :8080
    C->>S: mapper: request DTO → internal dto
    S->>P: findById(projectId)
    P-->>S: ProjectRef? (404 if null)
    S->>D: insert(TaskEntity)
    D->>DB: JPA (own tables) / JdbcClient (cross-module reads)
    DB-->>D: rows
    D-->>S: entity
    S-->>C: entity
    C-->>B: mapper: entity → contract model (JSON) or ProblemDetail (RFC 9457)
```

## Frontend structure

```
frontend/src/
  app/        providers, Redux store, router setup (code-based TanStack Router)
  features/   <feature>/ components, hooks, routes, slice — no imports between features
  shared/     api/ (http.ts mutator, generated/), ui/ (shadcn primitives + states), lib/
```

State placement: server data → TanStack Query; shared UI state → Redux Toolkit; form state →
React Hook Form; URL-worthy state → router search params; local state → `useState`.
See [frontend/AGENTS.md](../frontend/AGENTS.md) and ADRs 0006, 0007, 0011.

## Boundaries that matter

- Only the backend connects to the database (ADR 0005). The frontend never uses supabase-js data access.
- The contract is the source of truth for the API; generated code is never edited (ADR 0002).
- Authentication: Supabase Auth JWTs validated by the backend (ADR 0013, not built yet); `frontend/src/shared/api/http.ts` is the single place a token
  will be attached.
