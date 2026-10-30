// Flow: edit-delete-vehicle — "rename a vehicle, then delete it with confirmation" (CRITICAL_FLOWS.md)
// Spec: docs/specs/vehicles.md · Plan: e2e/plans/edit-delete-vehicle.md
import { expect, test } from '../fixtures/test';
import { isHome } from '../fixtures/urls';

test.describe('Edit and delete vehicle', () => {
  test('renames a vehicle, keeps it when delete is cancelled, then deletes it', async ({
    page,
    api,
    uniqueName,
  }) => {
    const original = uniqueName('Octavia');
    const renamed = uniqueName('Family car');
    const vehicle = await api.createVehicle(original);

    // 1. Rename
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${original}`) }).click();
    await expect(page.getByRole('heading', { name: original, level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Edit vehicle' }).click();
    const nickname = page.getByLabel('Nickname');
    await expect(nickname).toHaveValue(original);
    await nickname.fill(renamed);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.getByRole('heading', { name: renamed, level: 1 })).toBeVisible();

    // 2. Cancelling the confirmation keeps the vehicle
    await page.getByRole('link', { name: 'Edit vehicle' }).click();
    await expect(nickname).toHaveValue(renamed);
    await page.getByRole('button', { name: 'Delete vehicle' }).click();
    const dialog = page.getByRole('alertdialog', { name: `Delete ${renamed}?` });
    await expect(dialog).toContainText('expenses and planned expenses');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Edit vehicle', level: 1 })).toBeVisible();
    await expect(nickname).toHaveValue(renamed);

    // 3. Delete
    await page.getByRole('button', { name: 'Delete vehicle' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete vehicle' }).click();

    await expect(page).toHaveURL(isHome);
    await expect(page.getByRole('heading', { name: 'Garage', level: 1 })).toBeVisible();
    await expect(page.getByText(`${renamed} deleted`)).toBeVisible();
    await expect(page.getByText(renamed, { exact: true })).toHaveCount(0);
    await expect(page.getByText(original, { exact: true })).toHaveCount(0);

    await page.goto(`/vehicles/${vehicle.id}`);
    await expect(page.getByText('Could not load the vehicle')).toBeVisible();
  });
});
