/**
 * In-memory replacement for `@/shared/auth/session` (installed for every test in setup.ts), so
 * component tests never call Supabase. Tests start signed in; use `fakeAuth` to change that.
 */
import { InvalidCredentialsError, type AuthSession } from '@/shared/auth/errors';

export const TEST_EMAIL = 'driver@example.com';
export const TEST_PASSWORD = 'correct-password';

let session: AuthSession | null = null;
const listeners = new Set<() => void>();

export const fakeAuth = {
  signedIn(email = TEST_EMAIL) {
    session = { email, accessToken: 'test-access-token' };
  },
  signedOut() {
    session = null;
  },
  isSignedIn: () => session !== null,
};

export async function getSession(): Promise<AuthSession | null> {
  return Promise.resolve(session);
}

export async function signIn(email: string, password: string): Promise<void> {
  if (email !== TEST_EMAIL || password !== TEST_PASSWORD) throw new InvalidCredentialsError();
  fakeAuth.signedIn(email);
  return Promise.resolve();
}

export async function signOut(): Promise<void> {
  session = null;
  listeners.forEach((listener) => {
    listener();
  });
  return Promise.resolve();
}

export function onSignedOut(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
