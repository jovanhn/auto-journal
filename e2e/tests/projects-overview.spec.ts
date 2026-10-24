// Flow: projects-overview — "create a project and see it in the list" (CRITICAL_FLOWS.md)
// Spec: docs/specs/projects-overview.md · Plan: e2e/plans/projects-overview.md
import { expect, test } from '../fixtures/test';

test.describe('Projects overview', () => {
  test('creates a project and shows it in the list', async ({ page, uniqueName }) => {
    const name = uniqueName('Garden');
    await page.goto('/');

    await page.getByLabel('Name').fill(name);
    await page.getByLabel('Description (optional)').fill('Vegetables and herbs');
    await page.getByRole('button', { name: 'Create project' }).click();

    const projects = page.getByRole('table', { name: 'Projects' });
    const row = projects.getByRole('row', { name: new RegExp(name) });
    await expect(row.getByRole('link', { name })).toBeVisible();
    // A new project has no tasks yet.
    await expect(row.getByRole('cell')).toHaveText([name, '0', '0']);
    await expect(page.getByLabel('Name')).toHaveValue('');
  });

  test('shows the duplicate-name error on the name field', async ({ page, api, uniqueName }) => {
    const name = uniqueName('Kitchen');
    await api.createProject(name);
    await page.goto('/');

    // Uniqueness is case-insensitive.
    const nameField = page.getByLabel('Name');
    await nameField.fill(name.toUpperCase());
    await page.getByRole('button', { name: 'Create project' }).click();

    await expect(page.getByText('A project with this name already exists.')).toBeVisible();
    await expect(nameField).toHaveAttribute('aria-invalid', 'true');
  });
});
