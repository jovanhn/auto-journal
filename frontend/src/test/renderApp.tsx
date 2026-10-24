import { render } from '@testing-library/react';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { AppProviders } from '@/app/AppProviders';
import { makeQueryClient } from '@/app/queryClient';
import { makeRouter } from '@/app/router';
import { makeStore } from '@/app/store';

/** Renders the real app (providers + route tree) at `url` with fresh query client and store. */
export function renderApp(url = '/') {
  const queryClient = makeQueryClient();
  queryClient.setDefaultOptions({ queries: { ...queryClient.getDefaultOptions().queries, retry: false } });
  const store = makeStore();
  const router = makeRouter(createMemoryHistory({ initialEntries: [url] }));

  const result = render(
    <AppProviders queryClient={queryClient} store={store}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...result, router, queryClient, store };
}
