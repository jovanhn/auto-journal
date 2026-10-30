import { expect, test as setup } from '@playwright/test';
import { e2eUser } from './fixtures/env';
import { isHome, STORAGE_STATE } from './fixtures/urls';

/**
 * Signs the E2E test user in once through the UI and saves the session (Supabase keeps it in
 * localStorage), so every other test starts signed in. The sign-in flow itself is its own test.
 */
setup('sign in', async ({ page }) => {
  const { email, password } = e2eUser();
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(isHome);

  await page.context().storageState({ path: STORAGE_STATE });
});
