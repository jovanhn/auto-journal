# 0019. Google sign-in with open sign-up

- **Status:** Accepted
- **Date:** 2026-11-08

## Context

Sign-up was closed (ADRs 0013, 0015, 0018): the owner created every account in the Supabase dashboard, with
email + password. The owner wants people to sign in with Google, and to let any Google account use the app.
Data is already scoped per user (BR-U2), so a new user sees only their own data.

## Decision

- **Google provider in Supabase Auth.** The frontend calls `signInWithOAuth({ provider: 'google' })` in
  `src/shared/auth/session.ts`, the only Supabase module (ADR 0015). No new dependency.
- **PKCE flow.** The Supabase client uses `flowType: 'pkce'` with `detectSessionInUrl: false`; the route
  `/auth/callback` exchanges the one-time `code` for a session in its loader and then opens the requested
  same-app path. Tokens never appear in the URL fragment.
- **Open sign-up through Google.** Supabase's "Allow new users to sign up" is on. A Google account whose
  email matches an existing user signs in as that user (Supabase links verified identities). The app has
  no email sign-up form; email + password users are still created by the owner.
- **Backend unchanged.** Google users get the same Supabase JWTs; the profile is created on the first
  request (BR-U3).

## Consequences

- Anyone with a Google account can create a user and data in the production database. Accepted: data is
  per user. Abuse (many accounts) would need a new decision (allow-list, captcha, closing sign-up again).
- With sign-ups on, the Supabase API also accepts email sign-ups from anyone holding the publishable key;
  "Confirm email" stays on so those need a verified address. Same exposure as Google sign-up.
- Supabase's Redirect URLs must list every frontend origin (`operations.md`); otherwise Supabase falls back
  to the Site URL and the code is lost.
- Google sign-in is not tested end to end (Google's page can't be automated in CI); component tests cover
  the button and callback, and the owner checks it by hand after deploy.
- Supersedes the "closed sign-up" parts of ADRs 0015 and 0018.

## Alternatives considered

- **Google for existing accounts only (sign-up stays closed)** — keeps the app private, but every new user
  still needs the owner. The owner chose open sign-up.
- **Implicit flow with `detectSessionInUrl: true`** — less code, but tokens pass through the URL fragment
  and the session is picked up on any page, not in one place we can test.
