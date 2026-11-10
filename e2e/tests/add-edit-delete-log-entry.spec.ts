// Flow: add-edit-delete-log-entry — "add a log entry with an odometer reading, see it in the journal and the current
// odometer in the app bar update; edit its note; delete it with confirmation" (CRITICAL_FLOWS.md)
// Spec: docs/specs/journal.md · Plan: e2e/plans/add-edit-delete-log-entry.md
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A stat tile: its label and value share one box. */
const tile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=..');

test.describe('Add, edit and delete log entry', () => {
  test('adds an odometer reading that moves the odometer but not the totals, edits it, then deletes it', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    const note = uniqueName('Brake noise');
    await api.createVehicle(nickname, { odometerAtStart: 184320 });
    const now = new Date();
    const year = now.getFullYear();
    const monthName = now.toLocaleString('en-US', { month: 'long' });
    const shortDate = `${monthName.slice(0, 3)} ${now.getDate()}`;
    const todayIso = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const subtitle = page.getByText(/^VW Golf 7 · 2016 · /);
    const readingRow = page.getByRole('link', { name: /^Log: Odometer reading/ });
    const noteRow = page.getByRole('link', { name: new RegExp(`^Log: ${escape(note)}`) });

    // 1. The new vehicle has an empty journal
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) }).click();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(subtitle).toHaveText(/184,320 km$/);
    await expect(page.getByRole('navigation', { name: 'Vehicle sections' }).getByRole('link', { name: 'Journal' })).toBeVisible();
    await expect(page.getByText(`No journal entries in ${year}`)).toBeVisible();

    // 2. Add a log entry with an odometer reading
    await page.getByRole('link', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('form', { name: 'Add to journal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expense', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(page.getByLabel('Amount')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Fuel' })).toHaveCount(0);
    await expect(page.getByText('Add an odometer reading, a note, or both')).toBeVisible();
    await expect(page.getByLabel('Date')).toHaveValue(todayIso);
    await page.getByLabel('Odometer (km, optional)').fill('185,000');
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    await expect(page.getByText('Log added')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    const month = page.getByRole('region', { name: monthName });
    await expect(month.getByRole('heading')).toHaveText(monthName);
    await expect(readingRow).toContainText(shortDate);
    await expect(readingRow).toContainText('185,000 km');
    await expect(readingRow).not.toContainText('€');
    await expect(tile(page, 'This year')).toContainText('€0');
    await expect(tile(page, 'This month')).toContainText('€0');
    await expect(subtitle).toHaveText(/185,000 km$/);

    // 3. Edit its note
    await readingRow.click();
    await expect(page.getByRole('form', { name: 'Edit log' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Odometer (km, optional)')).toHaveValue('185000');
    await page.getByLabel('Note (optional)').fill(note);
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Changes saved')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(noteRow).toContainText(shortDate);
    await expect(noteRow).toContainText('185,000 km');

    // 4. Cancelling the delete confirmation keeps the log entry
    await noteRow.click();
    await page.getByRole('button', { name: 'Delete log' }).click();
    const dialog = page.getByRole('alertdialog', { name: 'Delete this log entry?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole('form', { name: 'Edit log' })).toBeVisible();
    await expect(page.getByLabel('Note (optional)')).toHaveValue(note);

    // 5. Delete the log entry
    await page.getByRole('button', { name: 'Delete log' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Log deleted')).toBeVisible();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(page.getByText(`No journal entries in ${year}`)).toBeVisible();
    await expect(noteRow).toHaveCount(0);
    await expect(subtitle).toHaveText(/184,320 km$/);
  });
});
