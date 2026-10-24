import { createRootRoute } from '@tanstack/react-router';
import { EmptyState } from '@/shared/ui/EmptyState';
import { RootLayout } from './RootLayout';

/** Root of the route tree. Feature routes attach to it (see app/router.tsx). */
export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <EmptyState title="Page not found" description="This page does not exist." />,
});
