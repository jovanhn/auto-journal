# Glossary

| Term             | Meaning                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------- |
| **Project**      | A named container for tasks. Names are unique, case-insensitive.                         |
| **Task**         | A unit of work that belongs to exactly one project. Has a title and a status.            |
| **Status**       | Task state: `OPEN` (not done) or `DONE` (completed).                                     |
| **Open task**    | A task with status `OPEN`.                                                               |
| **Done task**    | A task with status `DONE`.                                                               |
| **Close a task** | Change a task's status from `OPEN` to `DONE`. *(Planned — see specs/close-task.md)*      |
| **Subtask**      | A task whose optional parent is another task. *(Planned — see specs/subtasks.md)*        |
| **Parent task**  | The task a subtask belongs to.                                                           |
| **Project summary** | A project together with its open- and done-task counts, as shown in the projects list. |
