# Business rules

Each rule has an ID referenced by specs and tests. "Enforced" says where the rule is implemented today.

| ID      | Rule                                                                 | Enforced                                                         |
| ------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| BR-P1   | A project name is required.                                          | Contract (`minLength`, non-blank pattern), bean validation → 400 |
| BR-P2   | Project names are unique, case-insensitive.                          | `ProjectService` → 409 with field error `name`; unique index     |
| BR-T1   | A task title is 1–200 characters.                                    | Contract (`minLength`/`maxLength`), bean validation → 400        |
| BR-T2   | A task belongs to exactly one project, which must exist.             | `TaskService` via `ProjectApi` → 404; FK `task.project_id`       |
| BR-T3   | A new task is `OPEN`.                                                | `TaskEntity` default                                             |
| BR-T4   | A task cannot be closed while it has open subtasks.                  | **Planned** — specs/close-task.md, specs/subtasks.md             |
| BR-T5   | Closing an already-done task is a no-op.                             | **Planned** — specs/close-task.md                                |

Interpretation notes (assumptions, confirm before changing):

- Names and titles are trimmed before validation and storage; uniqueness compares trimmed names.
- Error mapping: validation → 400, missing resource → 404, business-rule violation → 409, all as
  RFC 9457 `ProblemDetail` with optional field `errors` (see contracts/AGENTS.md).
