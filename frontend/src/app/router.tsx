import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { signInRoute } from '@/features/auth/routes';
import { projectDetailRoute, projectsRoute } from '@/features/projects/routes';
import { settingsRoute } from '@/features/settings/routes';
import { authenticatedRoute } from './authenticatedRoute';
import { rootRoute } from './rootRoute';

/**
 * Code-based route tree: each feature exports its routes from `features/<feature>/routes`.
 * Everything except sign-in lives under the authenticated layout route.
 */
export const routeTree = rootRoute.addChildren([
  signInRoute,
  authenticatedRoute.addChildren([projectsRoute, projectDetailRoute, settingsRoute]),
]);

export const makeRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
