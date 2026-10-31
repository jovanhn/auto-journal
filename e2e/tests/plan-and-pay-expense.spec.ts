// Flow: plan-and-pay-expense — "plan a recurring expense, mark it as paid, and see the new expense in the
// Expenses list and the plan's due date moved forward" (CRITICAL_FLOWS.md)
// Spec: docs/specs/planned-expenses.md · Plan: e2e/plans/plan-and-pay-expense.md
import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Oct 31, 2026`, as the app shows due dates. */
const mediumDate = (date: Date) => `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** The same day next year; Feb 29 becomes Feb 28 (the backend clamps to the month's last day). */
const nextYear = (date: Date) => {
  const day = Math.min(date.getDate(), new Date(date.getFullYear() + 1, date.getMonth() + 1, 0).getDate());
  return new Date(date.getFullYear() + 1, date.getMonth(), day);
};

/** A stat tile: its label and value share one box. */
const tile = (page: Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=..');

test.describe('Plan and pay an expense', () => {
  test('plans a yearly expense, marks it as paid, and finds the expense and the moved due date', async ({
    page,
    api,
    uniqueName,
  }) => {
    const nickname = uniqueName('Golf');
    const note = uniqueName('renewal');
    await api.createVehicle(nickname);
    const today = new Date();
    const title = `Insurance · ${note}`;
    const card = page.getByRole('article', { name: title });
    const vehicleCard = page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) });
    const hero = page.getByRole('region', { name: 'Projected cost' });

    // 1. The new vehicle has nothing planned
    await page.goto('/');
    await vehicleCard.click();
    await page.getByRole('link', { name: 'Planned' }).click();
    await expect(page.getByRole('link', { name: 'Planned' })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(page.getByText('Planned expenses', { exact: true })).toBeVisible();
    await expect(hero).toContainText('Projected · next 12 months');
    await expect(hero).toContainText('≈ €0');
    await expect(page.getByText('Nothing planned yet')).toBeVisible();

    // 2. Plan a recurring expense
    await page.getByRole('link', { name: 'Plan an expense' }).click();
    await expect(page.getByRole('form', { name: 'Plan an expense' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');
    await page.getByLabel('Estimated amount').fill('320');
    await page.getByRole('button', { name: 'Insurance' }).click();
    await page.getByLabel('Due date').fill(isoDate(today));
    await page.getByRole('combobox', { name: 'Repeats' }).selectOption({ label: 'Every year' });
    await page.getByLabel('Note (optional)').fill(note);
    await page.getByRole('button', { name: 'Save plan' }).click();

    await expect(page.getByText('Expense planned')).toBeVisible();
    await expect(card).toBeVisible();
    await expect(card).toContainText(`${mediumDate(today)} · repeats yearly`);
    await expect(card).toContainText('€320');
    await expect(card).toContainText('Due today');
    await expect(hero).toContainText('≈ €320');

    await page.getByRole('link', { name: 'Back to garage' }).click();
    await expect(vehicleCard).toContainText(`Insurance · ${mediumDate(today)}`);

    // 3. Mark it as paid
    await vehicleCard.click();
    await page.getByRole('link', { name: 'Planned' }).click();
    await card.getByRole('link', { name: `Mark ${title} as paid` }).click();
    await expect(page.getByRole('form', { name: 'Mark as paid' })).toBeVisible();
    await expect(page.getByLabel('Amount')).toHaveValue('320.00');
    await expect(page.getByRole('combobox', { name: 'Currency' })).toHaveValue('EUR');
    await expect(page.getByLabel('Category')).toHaveValue('Insurance');
    await expect(page.getByLabel('Category')).not.toBeEditable();
    await expect(page.getByLabel('Date')).toHaveValue(isoDate(today));
    await expect(page.getByLabel('Note (optional)')).toHaveValue(note);
    await page.getByLabel('Amount').fill('330');
    await page.getByRole('button', { name: 'Save expense' }).click();

    await expect(page.getByText('Expense recorded')).toBeVisible();
    await expect(card).toContainText(`${mediumDate(nextYear(today))} · repeats yearly`);
    await expect(card).toContainText(/In 1[12] months/);
    await expect(card).toHaveCount(1);

    // 4. The expense is in the Expenses list
    await page.getByRole('link', { name: 'Expenses' }).click();
    const row = page.getByRole('link', { name: new RegExp(escape(title)) });
    await expect(row).toContainText(`${MONTHS[today.getMonth()]} ${today.getDate()}`);
    await expect(row).toContainText('€330.00');
    await expect(tile(page, 'This month')).toContainText('€330');
  });
});
