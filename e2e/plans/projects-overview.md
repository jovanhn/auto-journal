# Plan: projects-overview

- **Spec:** [`docs/specs/projects-overview.md`](../../docs/specs/projects-overview.md) (section *E2E*)
- **Seed:** `e2e/seed.spec.ts`
- **Test:** [`e2e/tests/projects-overview.spec.ts`](../tests/projects-overview.spec.ts)
- **Status:** Reviewed

## Critical flow: create a project and see it in the list

Starting state: the app is running; other projects may exist. Test data uses a unique project name.

### 1. Create a project and see it in the list

1. Open the projects overview (`/`).
2. In the **New project** form, fill **Name** with a unique name and **Description (optional)** with any text.
3. Click **Create project**.

Expected:
- The **Projects** table contains a row for the new project, with its name as a link.
- The row shows `0` open tasks and `0` done tasks.
- The **Name** field is cleared (the form is ready for the next project).

### 2. Duplicate name is rejected and shown on the field

Setup (via API fixture): a project with a unique name `N` exists.

1. Open the projects overview (`/`).
2. Fill **Name** with `N` in different letter case (uniqueness is case-insensitive).
3. Click **Create project**.

Expected:
- The message "A project with this name already exists." is shown on the **Name** field.
- The **Name** field is marked invalid (`aria-invalid="true"`).
