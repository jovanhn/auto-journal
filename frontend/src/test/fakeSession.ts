/**
 * In-memory replacement for `@/shared/auth/session` (installed for every test in setup.ts), so
 * component tests never call Supabase. Tests start signed in; use `fakeAuth` to change that.
 */
import { InvalidCredentialsError, type AuthorizationRequest, type AuthSession } from '@/shared/auth/errors';

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

/** Fake Google sign-in: leaving for Google is recorded; only `fakeGoogle.validCode` completes it. */
export const fakeGoogle = {
  validCode: 'google-code',
  email: 'google.driver@example.com',
  redirects: [] as string[],
  failStart: false,
  reset() {
    this.redirects = [];
    this.failStart = false;
  },
};

export async function signInWithGoogle(redirect: string): Promise<void> {
  if (fakeGoogle.failStart) throw new Error('Network error');
  fakeGoogle.redirects.push(redirect);
  return Promise.resolve();
}

export async function completeGoogleSignIn(code: string): Promise<void> {
  if (code !== fakeGoogle.validCode) throw new Error('Invalid code');
  fakeAuth.signedIn(fakeGoogle.email);
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

/** Fake Supabase OAuth server: one known authorization request; decisions are recorded. */
export const fakeOAuth = {
  authorizationId: 'auth-123',
  request: { kind: 'consent', clientName: 'Claude', email: TEST_EMAIL } as AuthorizationRequest,
  decisions: [] as { authorizationId: string; approve: boolean }[],
  failDecision: false,
  reset() {
    this.request = { kind: 'consent', clientName: 'Claude', email: TEST_EMAIL };
    this.decisions = [];
    this.failDecision = false;
  },
};

export async function getAuthorizationRequest(authorizationId: string): Promise<AuthorizationRequest> {
  if (authorizationId !== fakeOAuth.authorizationId) throw new Error('Authorization not found or expired');
  return Promise.resolve(fakeOAuth.request);
}

export async function decideAuthorization(authorizationId: string, approve: boolean): Promise<string> {
  if (fakeOAuth.failDecision) throw new Error('Authorization expired');
  fakeOAuth.decisions.push({ authorizationId, approve });
  return Promise.resolve(
    approve
      ? 'https://claude.ai/api/mcp/auth_callback?code=abc'
      : 'https://claude.ai/api/mcp/auth_callback?error=access_denied',
  );
}
