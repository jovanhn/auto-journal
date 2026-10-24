# Spec: Projects overview

## Status

Implemented

## Goal

Let a user see all projects with their task counts, create projects, open a project, and add tasks to it.
This is the skeleton feature that demonstrates the full stack and the repository conventions.

## User stories

- As a user, I want to see all projects with how many tasks are open and done, so that I know where work stands.
- As a user, I want to create a project with a name and optional description, so that I can group tasks.
- As a user, I want to open a project and see its tasks, so that I can review its work.
- As a user, I want to add a task to a project, so that I can track new work.

## Business rules

- BR-P1: A project name is required.
- BR-P2: Project names are unique, case-insensitive.
- BR-T1: A task title is 1–200 characters.
- BR-T2: A task belongs to exactly one existing project.
- BR-T3: A new task is `OPEN`.

## Acceptance criteria

1. **List project summaries**
   - Given projects with tasks exist
   - When I open the projects overview
   - Then I see each project with its open and done task counts, newest project first, paginated
     (`page`, `size`; default size 10 in the UI, 20 in the API)
2. **Empty list**
   - Given no projects exist
   - When I open the projects overview
   - Then I see an empty state inviting me to create one
3. **Create a project**
   - Given the create-project form
   - When I submit a unique name (and optionally a description)
   - Then the project is created (201), the form is cleared, a confirmation toast appears, and the project
     appears in the list with 0 open / 0 done tasks
4. **Duplicate name**
   - Given a project named "Garden" exists
   - When I submit "gARDEN"
   - Then the API responds 409 with `errors: [{ field: "name", … }]` and the message is shown on the Name field
5. **Name required**
   - Given the create-project form
   - When the name is empty or blank and the field loses focus (or I submit)
   - Then "Name is required" is shown on the field and nothing is sent
6. **Project detail**
   - Given a project exists
   - When I open it
   - Then I see its name, description, and its tasks (paginated)
7. **Unknown project**
   - When I open a project that does not exist
   - Then I see a "Project not found" state (API: 404)
8. **Add a task**
   - Given a project
   - When I submit a title of 1–200 characters
   - Then the task is created as `OPEN` (201), it appears in the list, and the project's open count increases
9. **Invalid task title**
   - When I submit an empty title or one longer than 200 characters
   - Then I see a validation error on the Title field (API: 400 with field error `title`)

## Edge cases

- Names/titles are trimmed; "  Garden  " is stored as "Garden" and counts as a duplicate of "garden".
- Page size above 100 or negative page → 400 with a field error for the parameter.
- Malformed project ID in the URL → 400.
- Concurrent creation of the same name: the unique index rejects the second insert → 409.

## API impact

Implemented in `contracts/openapi.yaml`: `GET/POST /api/projects`, `GET /api/projects/{projectId}`,
`GET/POST /api/projects/{projectId}/tasks`; `ProblemDetail`; pagination envelope.

## UI notes

- `/` — "New project" form (Name, Description) and the projects table (TanStack Table + shadcn table),
  pagination in search params (`?page=&size=`).
- `/projects/$projectId` — header with back link, "New task" form, task list, pagination.
- Every list handles loading, empty, and error states. Forms validate on blur, re-validate on change
  after the first submit, and disable submit while pending.

## E2E

- **create a project and see it in the list**, including the server-side duplicate-name error shown on the
  field → [e2e/plans/projects-overview.md](../../e2e/plans/projects-overview.md)

## Out of scope

- Editing or deleting projects and tasks; closing tasks (specs/close-task.md); subtasks (specs/subtasks.md);
  authentication; sorting/filtering.
