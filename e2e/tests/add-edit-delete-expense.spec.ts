// Flow: add-edit-delete-expense — "add an expense and see it in the list and in the 'This year' tile; edit it;
// delete it with confirmation" (CRITICAL_FLOWS.md)
// Spec: docs/specs/expenses.md · Plan: e2e/plans/add-edit-delete-expense.md
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A stat tile: its label and value share one box. */
const tile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=..');

test.describe('Add, edit and delete expense', () => {
  test('adds an expense that counts in the list and tiles, edits it, then deletes it', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    const note = uniqueName('Shell');
    await api.createVehicle(nickname, { odometerAtStart: 184320 });
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const shortDate = `${monthName.slice(0, 3)} ${now.getDate()}`;
    const subtitle = page.getByText(/^VW Golf 7 · 2016 · /);
    const row = page.getByRole('link', { name: new RegExp(`Fuel · ${escape(note)}`) });

    // 1. The new vehicle has no expenses
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) }).click();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(subtitle).toHaveText(/184,320 km$/);
    await expect(tile(page, 'This year')).toContainText('€0');
    await expect(tile(page, 'This month')).toContainText('€0');
    await expect(page.getByText(`No expenses in ${year}`)).toBeVisible();

    // 2. Add an expense
    await page.getByRole('link', { name: 'Add expense' }).click();
    await expect(page.getByRole('form', { name: 'New expense' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');
    const todayIso = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    await expect(page.getByLabel('Date')).toHaveValue(todayIso);
    await page.getByLabel('Amount').fill('52.40');
    await page.getByRole('button', { name: 'Fuel' }).click();
    await page.getByLabel('Odometer (km, optional)').fill('184,500');
    await page.getByLabel('Note (optional)').fill(note);
    await page.getByRole('button', { name: 'Save expense' }).click();

    await expect(page.getByText('Expense added')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    const month = page.getByRole('region', { name: monthName });
    await expect(month.getByRole('heading')).toContainText(monthName);
    await expect(month.getByRole('link', { name: new RegExp(`Fuel · ${escape(note)}`) })).toBeVisible();
    await expect(row).toContainText(shortDate);
    await expect(row).toContainText('184,500 km');
    await expect(row).toContainText('€52.40');
    await expect(tile(page, 'This year')).toContainText('€52.40');
    await expect(tile(page, 'This month')).toContainText('€52.40');
    await expect(subtitle).toHaveText(/184,500 km$/);

    // 3. Edit the expense
    await row.click();
    await expect(page.getByRole('form', { name: 'Edit expense' })).toBeVisible();
    const amount = page.getByLabel('Amount');
    await expect(amount).toHaveValue('52.40');
    await expect(page.getByRole('button', { name: 'Fuel' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Note (optional)')).toHaveValue(note);
    await amount.fill('60');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(row).toContainText('€60.00');
    await expect(tile(page, 'This year')).toContainText('€60');

    // 4. Cancelling the delete confirmation keeps the expense
    await row.click();
    await page.getByRole('button', { name: 'Delete expense' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete this expense?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('form', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveValue('60.00');

    // 5. Delete the expense
    await page.getByRole('button', { name: 'Delete expense' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Expense deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(page.getByText(`No expenses in ${year}`)).toBeVisible();
    await expect(row).toHaveCount(0);
    await expect(tile(page, 'This year')).toContainText('€0');
    await expect(subtitle).toHaveText(/184,320 km$/);
  });
});
