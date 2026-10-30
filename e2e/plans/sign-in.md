# Plan: sign-in

- **Spec:** [`docs/specs/auth.md`](../../docs/specs/auth.md) (section *E2E*; acceptance criteria 8 and 11)
- **Seed:** none — the test starts signed out (empty storage state), unlike every other test
- **Test:** `e2e/tests/sign-in.spec.ts`
- **Status:** Reviewed 2026-10-30

## Critical flow: sign in, stay signed in, sign out

Starting state: the app is running; the E2E test user (`E2E_USER_EMAIL` / `E2E_USER_PASSWORD`) exists in
Supabase Auth. The browser has no stored session.

Note: the spec says the user lands on the **Garage**. Until the vehicles feature replaces it, the home page
(`/`) is the **Projects** overview; the test asserts the home URL and its heading, and the heading assertion
changes to *Garage* when that screen ships.

### 1. Sign in and land on the home page

1. Open `/`.
2. Expect to be redirected to `/sign-in` with the **Sign in** heading.
3. Fill **Email** and **Password** with the E2E user's credentials.
4. Click **Sign in**.

Expected:
- The URL is `/` and the home page heading is visible.
- The app bar shows the **Settings** link.

### 2. Reload keeps the session

1. Reload the page.

Expected:
- The URL is still `/` and the home page heading is visible (no redirect to sign-in).

### 3. Sign out returns to sign-in

1. Click **Settings** in the app bar.
2. Expect the **Settings** heading and "Signed in as <E2E user email>".
3. Click **Sign out**.

Expected:
- The URL is `/sign-in` and the **Sign in** heading is visible.
- Opening `/` again redirects to `/sign-in` (the session is cleared).
