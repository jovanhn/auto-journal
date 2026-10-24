# Spec: Subtasks

## Status

Planned

## Goal

Let a user break a task into smaller tasks (subtasks), so that larger work can be tracked step by step.

## User stories

- As a user, I want to add a subtask to a task, so that I can split work into steps.
- As a user, I want to see a task's subtasks, so that I know what remains.

## Business rules

- A task has an optional parent task (domain/entities.md).
- A subtask belongs to the same project as its parent.
- BR-T4: A task cannot be closed while it has open subtasks (enforced by specs/close-task.md).

## Acceptance criteria

1. **Add a subtask**
   - Given a task in a project
   - When I add a task with that task as its parent
   - Then the new task is created `OPEN`, in the same project, with the given parent
2. **Parent must exist in the same project**
   - When I add a subtask whose parent does not exist or belongs to another project
   - Then the request is rejected (404 for a missing parent; 409 or 400 for a parent in another project —
     confirm which before implementing)
3. **List subtasks**
   - Given a task with subtasks
   - When I view the project
   - Then I can see which tasks are subtasks of which parent

## Edge cases

- Nesting depth: unspecified — confirm before implementing whether subtasks may have subtasks.
- Cycles must be impossible (a task cannot be its own ancestor).
- Project task counts: confirm whether subtasks count toward open/done counts (assumption: yes, all tasks count).

## API impact

To be designed when implemented (contract first). Expected: an optional `parentTaskId` on task creation and
in the `Task` schema; a migration adding `task.parent_task_id` (FK → `task.id`, owned by `tasks`).
Adding an optional field is non-breaking.

## UI notes

- Show subtasks under their parent in the project detail; allow adding a subtask from a task.

## E2E

- none (decide when implementing)

## Out of scope

- Moving subtasks between parents or projects, drag-and-drop reordering.
