import { createRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { rootRoute } from '@/app/rootRoute';
import { getSession } from '@/shared/auth/session';
import { OAuthConsentPage } from './OAuthConsentPage';
import { SignInPage } from './SignInPage';

/** `redirect`: the page the user opened while signed out; they return to it after signing in. */
const signInSearchSchema = z.object({
  redirect: z.string().optional().catch(undefined),
});

export const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  validateSearch: signInSearchSchema,
  beforeLoad: async () => {
    if (await getSession()) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects are thrown
      throw redirect({ to: '/' });
    }
  },
  component: SignInPage,
});

/** `authorization_id`: set by Supabase's OAuth server when an assistant asks for access (ADR 0018). */
const consentSearchSchema = z.object({
  authorization_id: z.string().min(1).optional().catch(undefined),
});

/** Public route outside the app layout; signed-out users sign in first and come back (specs/assistant-mcp.md). */
export const oauthConsentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/oauth/consent',
  validateSearch: consentSearchSchema,
  beforeLoad: async ({ location }) => {
    if (!(await getSession())) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects are thrown
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
  },
  component: OAuthConsentPage,
});
