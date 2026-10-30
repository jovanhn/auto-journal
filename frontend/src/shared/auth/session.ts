/**
 * The only module that talks to Supabase, and only for auth (ADR 0015): sign in, session, token
 * refresh and sign out. Never use the Supabase client for data — only the backend reads the database.
 * Tests replace this module with `src/test/fakeSession.ts`.
 */
import { createClient, isAuthApiError, type SupabaseClient } from '@supabase/supabase-js';
import { InvalidCredentialsError, type AuthSession } from './errors';

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
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
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
