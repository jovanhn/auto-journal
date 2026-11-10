// Flow: convert-log-entry — "turn a log entry into an expense and see the 'This year' tile include it; turn it back
// into a log entry (confirming) and see the tile drop it" (CRITICAL_FLOWS.md)
// Spec: docs/specs/journal.md · Plan: e2e/plans/convert-log-entry.md
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** A stat tile: its label and value share one box. */
const tile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=..');

test.describe('Convert log entry', () => {
  test('turns a log entry into an expense that counts, then back into a log entry that does not', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    const note = uniqueName('New wipers');
    const vehicle = await api.createVehicle(nickname, { odometerAtStart: 184320 });
    const entry = await api.createLogEntry(vehicle.id, { odometer: 185000, note });
    const shortDate = `${MONTHS[Number(entry.date.slice(5, 7)) - 1]} ${Number(entry.date.slice(8, 10))}`;
    const logRow = page.getByRole('link', { name: new RegExp(`^Log: ${escape(note)}`) });
    const expenseRow = page.getByRole('link', { name: new RegExp(`^Other · ${escape(note)}`) });
    const heading = page.getByRole('heading', { name: nickname, level: 1 });

    // 1. The journal shows the log entry and no cost
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) }).click();
    await expect(heading).toBeVisible();
    await expect(logRow).toContainText(shortDate);
    await expect(logRow).toContainText('185,000 km');
    await expect(logRow).not.toContainText('€');
    await expect(tile(page, 'Spent')).toContainText('€0');

    // 2. Turn the log entry into an expense
    await logRow.click();
    await expect(page.getByRole('form', { name: 'Edit log' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'This is an expense' })).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('switch', { name: 'This is an expense' }).click();
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');
    await expect(page.getByLabel('Date')).toHaveValue(entry.date);
    await expect(page.getByLabel('Odometer (km, optional)')).toHaveValue('185000');
    await expect(page.getByLabel('Note (optional)')).toHaveValue(note);
    await page.getByLabel('Amount').fill('25.00');
    await page.getByRole('button', { name: 'Other' }).click();
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Saved as an expense')).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(expenseRow).toContainText(shortDate);
    await expect(expenseRow).toContainText('185,000 km');
    await expect(expenseRow).toContainText('€25.00');
    await expect(tile(page, 'Spent')).toContainText('€25');

    // 3. Cancelling the cost removal keeps the expense
    await expenseRow.click();
    await expect(page.getByRole('form', { name: 'Edit expense' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'This is an expense' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByLabel('Amount')).toHaveValue('25.00');
    await page.getByRole('switch', { name: 'This is an expense' }).click();
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await expect(page.getByLabel('Note (optional)')).toHaveValue(note);
    await page.getByRole('button', { name: 'Save changes' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Remove the cost from this entry?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('form', { name: 'Edit expense' })).toBeVisible();

    // 4. Turn the expense back into a log entry
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove cost' }).click();

    await expect(page.getByText('Saved as a log')).toBeVisible();
    await expect(heading).toBeVisible();
    await expect(logRow).toContainText(shortDate);
    await expect(logRow).toContainText('185,000 km');
    await expect(logRow).not.toContainText('€');
    await expect(expenseRow).toHaveCount(0);
    await expect(tile(page, 'Spent')).toContainText('€0');
  });
});
