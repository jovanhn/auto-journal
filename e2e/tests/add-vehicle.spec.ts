// Flow: add-vehicle — "add a vehicle and see it in the Garage" (CRITICAL_FLOWS.md)
// Spec: docs/specs/vehicles.md · Plan: e2e/plans/add-vehicle.md
import { expect, test } from '../fixtures/test';
import { isHome } from '../fixtures/urls';

test.describe('Add vehicle', () => {
  test('adds a vehicle and shows it after the vehicles added before it', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    // Tests run in parallel for one user, so "last" is checked against a vehicle added just before.
    const earlier = await api.createVehicle(uniqueName('Earlier'));
    await page.goto('/');

    await page.getByRole('link', { name: 'Add vehicle', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New vehicle' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');

    await page.getByLabel('Nickname').fill(nickname);
    await page.getByLabel('Make').fill('VW');
    await page.getByLabel('Model').fill('Golf 7');
    await page.getByLabel('Year').fill('2016');
    await page.getByLabel('Current odometer (km)').fill('184320');
    await page.getByLabel('Price paid').fill('8500');
    await page.getByLabel('Date bought').fill('2023-05-10');
    await page.getByRole('button', { name: 'Add to garage' }).click();

    await expect(page).toHaveURL(isHome);
    await expect(page.getByRole('heading', { name: 'Garage', level: 1 })).toBeVisible();
    await expect(page.getByText(`${nickname} added to your garage`)).toBeVisible();

    const vehicles = page.getByRole('list', { name: 'Vehicles' });
    const card = vehicles.getByRole('listitem').filter({ hasText: nickname });
    await expect(card).toContainText('VW Golf 7 · 2016 · 184,320 km');
    await expect(card).toContainText('Value €8,500');

    // BR-V8: listed in the order added, so the new vehicle comes after the earlier one.
    const cards = await vehicles.getByRole('listitem').allInnerTexts();
    const position = (name: string) => cards.findIndex((text) => text.startsWith(name));
    expect(position(earlier.nickname)).toBeGreaterThanOrEqual(0);
    expect(position(nickname)).toBeGreaterThan(position(earlier.nickname));
  });
});
