// Flow: report-and-resolve-issue — "add an issue and see it under Open with its severity pill; resolve it as Fixed
// and see it under Resolved; open it and reopen it, and see it under Open again" (CRITICAL_FLOWS.md)
// Spec: docs/specs/issues.md · Plan: e2e/plans/report-and-resolve-issue.md
import { expect, test } from '../fixtures/test';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `Nov 10`, as an open issue row shows a date of the current year. */
const shortDate = (date: Date) => `${MONTHS[date.getMonth()]} ${date.getDate()}`;

/** `Nov 10, 2026`. */
const mediumDate = (date: Date) => `${shortDate(date)}, ${date.getFullYear()}`;

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

test.describe('Report and resolve an issue', () => {
  test('adds an issue, resolves it as Fixed and reopens it', async ({ page, api, uniqueName }) => {
    const nickname = uniqueName('Golf');
    const title = uniqueName('Brake pads');
    const note = 'Replace within ~5,000 km';
    await api.createVehicle(nickname);
    const today = new Date();
    const issuesTab = page.getByRole('link', { name: 'Issues', exact: true });
    const openList = page.getByRole('list', { name: 'Open issues' });
    const resolvedToggle = page.getByRole('button', { name: /^Resolved · / });

    // 1. The new vehicle has no issues
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(`^${escape(nickname)}`) }).click();
    await issuesTab.click();
    await expect(issuesTab).toHaveAttribute('aria-current', 'page');
    await expect(page.getByRole('heading', { name: nickname, level: 1 })).toBeVisible();
    await expect(page.getByText('Issues', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('No open issues')).toBeVisible();
    await expect(
      page.getByText('Note a warning light, a noise or something your mechanic said to keep an eye on.'),
    ).toBeVisible();
    await expect(resolvedToggle).toHaveCount(0);

    // 2. Add an issue
    await page.getByRole('link', { name: 'Add issue' }).click();
    await expect(page.getByRole('form', { name: 'New issue' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Watch' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'I noticed' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Date noticed')).toHaveValue(isoDate(today));
    await page.getByLabel('Title').fill(title);
    await page.getByRole('button', { name: 'Fix soon' }).click();
    await page.getByRole('button', { name: 'Mechanic' }).click();
    await page.getByLabel('Odometer (optional)').fill('184200');
    await page.getByLabel('Note (optional)').fill(note);
    await page.getByRole('button', { name: 'Save issue' }).click();

    await expect(page.getByText('Issue added')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open · 1' })).toBeVisible();
    const openRow = openList.getByRole('listitem');
    await expect(openRow).toHaveCount(1);
    await expect(openRow).toContainText(title);
    await expect(openRow).toContainText(`Mechanic · ${shortDate(today)} · 184,200 km`);
    await expect(openRow).toContainText('Fix soon');

    // 3. Resolve it as Fixed
    await openRow.getByRole('link').click();
    await expect(page.getByRole('form', { name: 'Edit issue' })).toBeVisible();
    await expect(page.getByLabel('Title')).toHaveValue(title);
    await page.getByRole('button', { name: 'Resolve issue' }).click();
    const sheet = page.getByRole('dialog', { name: 'Resolve issue' });
    await expect(sheet.getByRole('button', { name: 'Fixed' })).toHaveAttribute('aria-pressed', 'true');
    await expect(sheet.getByLabel('Date resolved')).toHaveValue(isoDate(today));
    await sheet.getByRole('button', { name: 'Resolve', exact: true }).click();

    await expect(page.getByText('Issue resolved')).toBeVisible();
    await expect(page.getByText('No open issues')).toBeVisible();
    await expect(page.getByText('Nothing to keep an eye on right now.')).toBeVisible();
    await expect(resolvedToggle).toHaveText('Resolved · 1');
    await expect(resolvedToggle).toHaveAttribute('aria-expanded', 'false');
    await resolvedToggle.click();
    await expect(resolvedToggle).toHaveAttribute('aria-expanded', 'true');
    const resolvedRow = page.getByRole('list', { name: 'Resolved issues' }).getByRole('listitem');
    await expect(resolvedRow).toHaveCount(1);
    await expect(resolvedRow).toContainText(title);
    await expect(resolvedRow).toContainText(`Fixed · ${mediumDate(today)}`);

    // 4. Open it and reopen it
    await resolvedRow.getByRole('link').click();
    await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
    await expect(page.getByText('Fixed', { exact: true })).toBeVisible();
    await expect(page.getByText(`Resolved ${mediumDate(today)}`)).toBeVisible();
    const details = page.getByRole('definition');
    await expect(details.nth(0)).toHaveText('Fix soon');
    await expect(details.nth(1)).toHaveText('Mechanic');
    await expect(details.nth(2)).toHaveText(`${mediumDate(today)} · 184,200 km`);
    await expect(page.getByText(note)).toBeVisible();
    await page.getByRole('button', { name: 'Reopen issue' }).click();

    await expect(page.getByText('Issue reopened')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open · 1' })).toBeVisible();
    await expect(openRow).toHaveCount(1);
    await expect(openRow).toContainText(title);
    await expect(openRow).toContainText(`Mechanic · ${shortDate(today)} · 184,200 km`);
    await expect(openRow).toContainText('Fix soon');
    await expect(resolvedToggle).toHaveCount(0);
  });
});
