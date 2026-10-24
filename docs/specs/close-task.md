# Spec: Close a task

## Status

Planned

## Goal

Let a user mark a task as done, so that project progress (open vs. done counts) reflects reality.

## User stories

- As a user, I want to close a task when the work is finished, so that it no longer counts as open.

## Business rules

- BR-T4: A task cannot be closed while it has open subtasks (depends on specs/subtasks.md; until subtasks
  exist, every task has zero subtasks and this rule never blocks).
- BR-T5: Closing an already-done task is a no-op.

## Acceptance criteria

1. **Close an open task**
   - Given an `OPEN` task without open subtasks
   - When I close it
   - Then its status becomes `DONE` and the project's open count decreases and done count increases
2. **Close an already-done task**
   - Given a `DONE` task
   - When I close it
   - Then the request succeeds, nothing changes (no-op), and the task is returned as `DONE`
3. **Open subtasks block closing**
   - Given an `OPEN` task with at least one `OPEN` subtask
   - When I close it
   - Then the request is rejected with 409 and a message explaining that open subtasks must be closed first;
     the task stays `OPEN`
4. **Unknown task**
   - When I close a task that does not exist (or does not belong to the project in the URL)
   - Then the response is 404

## Edge cases

- Closing twice concurrently: both succeed; the result is `DONE` (idempotent).
- Re-opening a task is not part of this spec.

## API impact

To be designed when implemented (update the contract first). Open questions for the implementer to confirm:
endpoint shape (e.g. a dedicated close operation vs. a status update), response body, and whether the
response for the no-op case differs from a real close.

## UI notes

- A control on each open task in the project detail list to close it; done tasks show as done.
- 409 is shown as a toast or inline message on the task; the list and counts refresh after success.

## E2E

- none (decide when implementing; closing a task is a candidate critical flow)

## Out of scope

- Re-opening tasks, bulk close, closing projects.
