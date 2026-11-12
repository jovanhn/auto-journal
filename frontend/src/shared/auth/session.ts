/**
 * The only module that talks to Supabase, and only for auth (ADR 0015): sign in (password or Google,
 * ADR 0019), session, token refresh, sign out, and the consent step of Supabase's OAuth server for
 * assistants (ADR 0018). Never use the Supabase client for data — only the backend reads the database.
 * Tests replace this module with `src/test/fakeSession.ts`.
 */
import { createClient, isAuthApiError, type SupabaseClient } from '@supabase/supabase-js';
import { InvalidCredentialsError, type AuthorizationRequest, type AuthSession } from './errors';

let client: SupabaseClient | undefined;

/** Created on first use, so builds and tests don't need the Supabase env vars. */
const supabase = (): SupabaseClient => {
  if (!client) {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must be set (see .env.example).');
    }
    client = createClient(url, key, {
      // PKCE: Google sign-in returns a one-time `?code=` to /auth/callback, exchanged there by
      // completeGoogleSignIn (not detected automatically, so the exchange happens exactly once).
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' },
    });
  }
  return client;
};

/** The current session, restored from storage and refreshed if needed; `null` when signed out. */
export async function getSession(): Promise<AuthSession | null> {
  const { data } = await supabase().auth.getSession();
  const session = data.session;
  if (!session) return null;
  return { email: session.user.email ?? '', accessToken: session.access_token };
}

/** Throws {@link InvalidCredentialsError} for a wrong email or password, another error otherwise. */
export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase().auth.signInWithPassword({ email, password });
  if (!error) return;
  if (isAuthApiError(error) && error.status === 400) throw new InvalidCredentialsError();
  throw error;
}

/**
 * Leaves the app for Google's sign-in page. Supabase sends the browser back to `/auth/callback` with a
 * one-time code; `redirect` is the app path to open afterwards. Any Google account may sign in
 * (a new one becomes a new user, specs/auth.md BR-U5).
 */
export async function signInWithGoogle(redirect: string): Promise<void> {
  const callback = new URL('/auth/callback', window.location.origin);
  callback.searchParams.set('redirect', redirect);
  const { error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback.toString() },
  });
  if (error) throw error;
}

/** Exchanges the code from the Google sign-in callback for a session. Throws if it is invalid or used. */
export async function completeGoogleSignIn(code: string): Promise<void> {
  const { error } = await supabase().auth.exchangeCodeForSession(code);
  if (error) throw error;
}

/** Clears the session on this device only. Listeners registered with {@link onSignedOut} run. */
export async function signOut(): Promise<void> {
  await supabase().auth.signOut({ scope: 'local' });
}

/** Runs `listener` whenever the user is signed out (sign-out button, failed token refresh, 401). */
export function onSignedOut(listener: () => void): () => void {
  const { data } = supabase().auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') listener();
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

/** The OAuth authorization request `authorizationId` (from the consent URL), for the signed-in user. */
export async function getAuthorizationRequest(authorizationId: string): Promise<AuthorizationRequest> {
  const { data, error } = await supabase().auth.oauth.getAuthorizationDetails(authorizationId);
  if (error) throw error;
  if ('client' in data) return { kind: 'consent', clientName: data.client.name, email: data.user.email };
  return { kind: 'redirect', redirectUrl: data.redirect_url };
}

/** Approves (or denies) the request and returns the URL that sends the user back to the client. */
export async function decideAuthorization(authorizationId: string, approve: boolean): Promise<string> {
  const oauth = supabase().auth.oauth;
  const options = { skipBrowserRedirect: true };
  const { data, error } = approve
    ? await oauth.approveAuthorization(authorizationId, options)
    : await oauth.denyAuthorization(authorizationId, options);
  if (error) throw error;
  return data.redirect_url;
}
