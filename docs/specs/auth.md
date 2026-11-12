# Spec: Sign-in and user profile

## Status

Implemented — release **v1 (MVP)**

## Goal

Let a user sign in and out with Supabase Auth and keep a per-user profile (display currency), so that every
later feature can scope data to its owner (ADR 0013). Anyone can sign in with Google; a new Google account
becomes a new user (ADR 0019). Email + password accounts are still created only by the owner in the Supabase
dashboard.

## User stories

- As the app owner, I want to create accounts myself in the Supabase dashboard, so that only people I choose
  can use the app.
- As a user, I want to sign in and stay signed in across reloads, so that I don't log in every time.
- As a user, I want to sign in with my Google account, so that I don't need a password for autojournal.
- As a user, I want to sign out, so that nobody else on this device sees my data.
- As a user, I want to choose my display currency, so that totals are shown in the currency I think in.

## Business rules

- BR-U1: Every API request requires a signed-in user (Supabase Auth: Google or email + password).
- BR-U2: A user sees and changes only their own data; another user's resource responds 404.
- BR-U3: A user profile is created on the user's first authenticated request, with display currency `EUR`.
- BR-U4: A user can change their display currency to any supported currency (BR-C1).
- BR-U5: Any Google account can sign in. A Google account whose email is not yet a user becomes a new user;
  one whose email matches an existing user signs in as that user (Supabase links the identities).

## Acceptance criteria

1. **Unauthenticated API request is rejected**
   - Given no `Authorization` header, or an expired / invalid / wrongly-issued token
   - When any `/api/**` endpoint is called
   - Then the response is 401 as a `ProblemDetail`
2. **Health stays public**
   - When `/actuator/health` is called without a token
   - Then it responds 200
3. **First request creates the profile**
   - Given a valid token for a user without a profile
   - When `GET /api/me` is called
   - Then a profile is created and returned with the user's id and `displayCurrency: EUR`
4. **Existing profile is returned unchanged**
   - Given a user whose display currency is `RSD`
   - When `GET /api/me` is called
   - Then `displayCurrency` is `RSD` and no second profile is created
5. **Change display currency**
   - Given a signed-in user
   - When they set the display currency to `USD`
   - Then the profile is updated and later calls return `USD`
6. **Unsupported currency is rejected**
   - When the display currency is set to a value outside `EUR`, `RSD`, `USD`
   - Then the response is 400 with a field error `displayCurrency`
7. **No email sign-up**
   - Given I am signed out
   - When I look at the sign-in page
   - Then there is no sign-up link or page; email + password accounts exist only if created in the
     Supabase dashboard (Google sign-in creates accounts, AC 12)
8. **Sign in and stay signed in**
   - Given an existing account
   - When I sign in with the correct email and password
   - Then I land on the Garage, and after a page reload I am still signed in
9. **Wrong credentials**
   - When I sign in with a wrong password or unknown email
   - Then I see one generic error ("Email or password is incorrect") and stay on the sign-in page
10. **Protected routes**
    - Given I am signed out
    - When I open any app route
    - Then I am redirected to sign-in, and after signing in I return to the route I opened
11. **Sign out**
    - Given I am signed in
    - When I sign out
    - Then the session is cleared, cached server data is dropped, and I see the sign-in page
12. **Sign in with Google**
    - Given I am signed out, on the sign-in page (possibly sent there from another app route)
    - When I choose "Continue with Google" and sign in at Google
    - Then I come back signed in to the route I opened (the Garage by default), with a new user created
      if my Google account was not a user yet, and after a reload I am still signed in
13. **Google sign-in cancelled or failed**
    - When I cancel at Google, or the sign-in link is invalid or already used
    - Then I see "Could not sign in with Google" with a link back to sign-in, and I am not signed in

## Edge cases

- Token expires while the app is open: the Supabase client refreshes it; if refresh fails, the next 401
  signs the user out and shows sign-in (no retry loop).
- Two requests for a brand-new user arrive at once: profile creation must be idempotent (unique `user_id`,
  insert-if-absent), never a 500 or duplicate.
- A user deleted in Supabase keeps a valid token until it expires; acceptable.
- Email is not stored by the backend (only `user_id`); the UI shows the email from the Supabase session.

### Decisions (were open questions)

1. **Sign-up.** Originally closed; since 2026-11 open through Google only (ADR 0019): Supabase's "Allow
   new users to sign up" is on, and the app offers no email sign-up form. The owner still creates email +
   password users in the Supabase dashboard (Authentication → Add user → Create new user, *auto-confirm*).
   No invite flow.
2. **Password reset** is out of scope; the owner resets passwords in the dashboard.
3. **Local development and E2E** sign in against the single Supabase project (ADR 0015); their data stays in
   the local Docker Postgres. The E2E test user's credentials come from `.env` locally and from CI secrets
   in CI.
4. **Display currency** is changed on a minimal Settings page (reached from the Garage app bar), built from
   existing design tokens and components until the design adds the screen (docs/design/design.md).
5. **Frontend dependency** `@supabase/supabase-js`, used for auth only, is approved by ADR 0015.
6. **Google sign-in** uses Supabase's Google provider with the PKCE flow: Supabase returns to the frontend
   route `/auth/callback?code=…&redirect=<path>`, which exchanges the code for a session and opens the path
   (same-app paths only). The backend is unchanged: Google users get the same Supabase JWTs.

## API impact

- `components.securitySchemes.bearerAuth` (HTTP bearer, JWT) and global `security: [bearerAuth: []]`;
  re-enable Redocly `security-defined`.
- New `401` response (`ProblemDetail`) on every operation.
- New `GET /api/me` → `UserProfile { userId: uuid, displayCurrency: Currency }` (creates on first call).
- New `PATCH /api/me` with `{ displayCurrency }` → `UserProfile`; 400 on invalid value.
- New shared schema `Currency` enum: `EUR`, `RSD`, `USD`.
- Breaking for existing clients: all existing `/api` operations (example projects/tasks) now need a token.
  Approved via ADR 0013.

## UI notes

- New pages: Sign in ("Continue with Google" button, then email + password, React Hook Form + Zod per the
  forms standard), the Google sign-in callback (`/auth/callback`: loading, then redirect or error), and
  Settings (display currency select + sign out), reached from the Garage app bar.
- Route guard in TanStack Router; the access token is attached only in `src/shared/api/http.ts`.
- On sign-out, clear the TanStack Query cache.
- States: submitting (disabled button), auth errors (generic message), network error, loading while the
  session is restored on startup (no flash of the sign-in page).

## E2E

- Sign in with a test user and reach the Garage; reload keeps the session; sign out returns to sign-in.
- Google sign-in is not covered by E2E (Google's sign-in page can't be automated in CI); the callback and
  button are covered by component tests, and the owner checks it by hand after deploy.

## Out of scope

- Email self sign-up, password reset, social sign-in other than Google, magic-link sign-in, multi-factor auth, account deletion, changing
  email or password, user names or avatars, shared vehicles.
