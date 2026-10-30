// Flow: sign-in — "sign in, stay signed in, sign out" (CRITICAL_FLOWS.md)
// Spec: docs/specs/auth.md · Plan: e2e/plans/sign-in.md
import { e2eUser } from '../fixtures/env';
import { expect, test } from '../fixtures/test';
import { isHome, isSignIn } from '../fixtures/urls';

// Starts signed out, unlike every other test.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sign in', () => {
  test('signs in, keeps the session on reload, and signs out', async ({ page }) => {
    const { email, password } = e2eUser();

    await page.goto('/');
    await expect(page).toHaveURL(isSignIn);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // Home is the Projects overview until the Garage screen ships (see the plan).
    await expect(page).toHaveURL(isHome);
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
    const settingsLink = page.getByRole('link', { name: 'Settings' });
    await expect(settingsLink).toBeVisible();

    await page.reload();
    await expect(page).toHaveURL(isHome);
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

    await settingsLink.click();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(isSignIn);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(isSignIn);
  });
});
