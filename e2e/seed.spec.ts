import { expect, test } from './fixtures/test';

/**
 * Seed test used by the Playwright planner/generator agents: brings the app into a usable state
 * (a project with tasks exists) and opens the projects overview.
 */
test('seed', async ({ page, api, uniqueName }) => {
  const project = await api.createProject(uniqueName('Seed project'), 'Created by the seed test');
  await api.createTask(project.id, 'First task');
  await api.createTask(project.id, 'Second task');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
});
