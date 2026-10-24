import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { projectDetailRoute, projectsRoute } from '@/features/projects/routes';
import { rootRoute } from './rootRoute';

/** Code-based route tree: each feature exports its routes from `features/<feature>/routes`. */
export const routeTree = rootRoute.addChildren([projectsRoute, projectDetailRoute]);

export const makeRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
