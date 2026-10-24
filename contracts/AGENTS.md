# AGENTS.md — contracts

`openapi.yaml` is the single source of truth for the HTTP API (ADR 0002). OpenAPI **3.0.3** (best generator
compatibility). Lint: `make contracts-lint` (Redocly, config in `redocly.yaml`). After any change: `make gen`.

## Conventions

- **Paths:** everything under `/api`. Plural, kebab-case resource nouns; nest only for ownership
  (`/api/projects/{projectId}/tasks`). Path params are camelCase IDs (`projectId`, `format: uuid`).
- **operationId:** required on every operation, camelCase verb + noun: `listProjects`, `getProject`,
  `createProject`, `listProjectTasks`, `createTask`. They become backend method names and frontend hook names
  (`useListProjects`) — renaming one is a breaking change for code.
- **Tags:** exactly one per operation, equal to the owning backend module (`projects`, `tasks`). The tag
  decides the generated interface (`ProjectsApi`) and frontend file.
- **Schemas:** PascalCase names; properties camelCase; list `required` explicitly; use `nullable: true` for
  optional values that may be null; put limits (`minLength`, `maxLength`, `pattern`, `minimum`, `maximum`)
  in the contract — they drive bean validation and frontend Zod schemas.
- **Requests/responses:** `Create<Thing>Request` bodies; created resources return `201` with the resource.

## Errors: ProblemDetail

All errors use `application/problem+json` with the shared `ProblemDetail` schema (RFC 9457):
`type`, `title`, `status`, `detail`, `instance`, plus optional `errors: [{ field, message }]` for field-level
validation or business-rule errors. Reuse the shared responses: `BadRequest` (400, validation),
`NotFound` (404), `Conflict` (409, domain rule violation). Every operation declares its 4xx responses.

## Pagination

Query params `page` (zero-based, default 0) and `size` (1–100, default 20) via the shared `Page` / `Size`
parameters. Response envelope: `{ items, page, size, totalItems }` named `<Thing>Page`.

## Breaking change policy

Breaking changes **require explicit approval** before they are made. Breaking includes: removing or
renaming a path, operation, operationId, tag, schema, or property; adding a required request property;
changing a type, format, or enum (removing values); tightening validation; changing status codes or error
shapes. Non-breaking: adding optional request properties, new response properties, new operations.
When approved, update all consumers in the same change and note it in the spec and commit
(`feat(contracts)!:` + `BREAKING CHANGE:` footer).
