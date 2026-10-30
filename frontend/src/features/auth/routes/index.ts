import { createRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';
import { rootRoute } from '@/app/rootRoute';
import { getSession } from '@/shared/auth/session';
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
