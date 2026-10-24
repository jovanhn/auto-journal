# 0004. Database access standard (JPA + JdbcClient)

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Multiple persistence technologies in one codebase make behavior (transactions, caching, SQL generation)
hard to predict and review, especially for agents. Module-owned writes benefit from an ORM; cross-module
and aggregate reads need plain SQL.

## Decision

> Use Spring Data JPA for module-owned persistence and `JdbcClient` for complex or
> cross-module reads. Do not introduce other database access APIs or frameworks
> without architectural approval.

- Write DAOs wrap the module's Spring Data JPA repositories (own entities only).
- Read DAOs use `JdbcClient` and are the only place allowed to JOIN other modules' tables, read-only.
- Entities reference other modules' data by ID (e.g. `projectId: UUID`), never by JPA relationships.
- Flyway owns the schema (`ddl-auto=validate`).

## Consequences

- Reviewers know where SQL lives and which module may write which table.
- Every cross-module read DAO needs an integration test against Testcontainers Postgres.
- Adding jOOQ, MyBatis, Exposed, R2DBC, etc. requires a new ADR.

## Alternatives considered

- **JPA only** — awkward and inefficient for aggregate/cross-module reads.
- **JdbcClient only** — more boilerplate for simple module-owned CRUD.
- **jOOQ** — powerful, but another framework and code generation step.
