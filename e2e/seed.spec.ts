import { expect, test } from './fixtures/test';

/**
 * Seed test used by the Playwright planner/generator agents: brings the app into a usable state
 * (the E2E user has a vehicle) and opens the Garage.
 */
test('seed', async ({ page, api, uniqueName }) => {
  const vehicle = await api.createVehicle(uniqueName('Seed car'));

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Garage', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: new RegExp(vehicle.nickname) })).toBeVisible();
});
