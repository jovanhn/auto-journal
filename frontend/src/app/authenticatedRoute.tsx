import { createRoute, redirect } from '@tanstack/react-router';
import { getSession } from '@/shared/auth/session';
import { AppLayout } from './AppLayout';
import { rootRoute } from './rootRoute';

/**
 * Pathless layout route for every signed-in page (BR-U1). Signed-out users are sent to sign-in and
 * come back to the page they opened. Child routes read the session from the route context.
 */
export const authenticatedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '_app',
  beforeLoad: async ({ location }) => {
    const session = await getSession();
    if (!session) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirects are thrown
      throw redirect({ to: '/sign-in', search: { redirect: location.href } });
    }
    return { session };
  },
  component: AppLayout,
});
