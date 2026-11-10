// Flow: filter-journal — "choose All and see both years; choose a category and see Spent and Entries change; search
// for a note; Clear filters" (CRITICAL_FLOWS.md)
// Spec: docs/specs/journal-filters.md · Plan: e2e/plans/filter-journal.md
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A stat tile: its label and value share one box. */
const tile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=..');

test.describe('Filter journal', () => {
  test('shows all years, one category, a search result, and clears the filters', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    const fuelNote = uniqueName('Shell');
    const serviceNote = uniqueName('Oil and filters');
    const logNote = uniqueName('Brake noise');
    const vehicle = await api.createVehicle(nickname);
    const fuel = await api.createExpense(vehicle.id, { amount: '50.00', category: 'FUEL', note: fuelNote });
    const year = Number(fuel.date.slice(0, 4));
    const lastYear = year - 1;
    await api.createExpense(vehicle.id, {
      amount: '120.00',
      category: 'SERVICE',
      note: serviceNote,
      date: `${lastYear}-03-01`,
    });
    await api.createLogEntry(vehicle.id, { note: logNote });

    const fuelRow = page.getByRole('link', { name: new RegExp(`^Fuel · ${escape(fuelNote)}`) });
    const serviceRow = page.getByRole('link', { name: new RegExp(`^Service · ${escape(serviceNote)}`) });
    const logRow = page.getByRole('link', { name: new RegExp(`^Log: ${escape(logNote)}`) });
    const years = page.getByRole('group', { name: 'Year' });
    const entryType = page.getByRole('combobox', { name: 'Entry type' });
    const search = page.getByRole('searchbox', { name: 'Search journal' });
    const filtered = page.getByText('Filtered results');

    // 1. The journal opens on the current year
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) }).click();
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(years.getByRole('button')).toHaveText(['All', String(year), String(lastYear)]);
    await expect(years.getByRole('button', { name: String(year) })).toHaveAttribute('aria-pressed', 'true');
    await expect(fuelRow).toBeVisible();
    await expect(logRow).toBeVisible();
    await expect(serviceRow).toHaveCount(0);
    await expect(tile(page, 'Spent')).toContainText('€50');
    await expect(tile(page, 'Entries')).toContainText('2');
    await expect(filtered).toHaveCount(0);

    // 2. All years
    await years.getByRole('button', { name: 'All' }).click();
    await expect(serviceRow).toBeVisible();
    await expect(page.getByRole('region', { name: `March ${lastYear}` })).toContainText(serviceNote);
    await expect(tile(page, 'Spent')).toContainText('€170');
    await expect(tile(page, 'Entries')).toContainText('3');
    await expect(filtered).toBeVisible();

    // 3. One category
    await entryType.selectOption({ label: 'Service' });
    await expect(serviceRow).toBeVisible();
    await expect(fuelRow).toHaveCount(0);
    await expect(logRow).toHaveCount(0);
    await expect(tile(page, 'Spent')).toContainText('€120');
    await expect(tile(page, 'Entries')).toContainText('1');

    // 4. Search
    await entryType.selectOption({ label: 'All entries' });
    await search.fill(logNote);
    await expect(logRow).toBeVisible();
    await expect(fuelRow).toHaveCount(0);
    await expect(serviceRow).toHaveCount(0);
    await expect(tile(page, 'Spent')).toContainText('€0');
    await expect(tile(page, 'Entries')).toContainText('1');

    // 5. Clear filters
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(search).toHaveValue('');
    await expect(years.getByRole('button', { name: String(year) })).toHaveAttribute('aria-pressed', 'true');
    await expect(filtered).toHaveCount(0);
    await expect(fuelRow).toBeVisible();
    await expect(logRow).toBeVisible();
    await expect(tile(page, 'Spent')).toContainText('€50');
    await expect(tile(page, 'Entries')).toContainText('2');
  });
});
