import type { ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { Provider as ReduxProvider } from 'react-redux';
import type { AppStore } from './store';

type AppProvidersProps = {
  queryClient: QueryClient;
  store: AppStore;
  children: ReactNode;
};

export function AppProviders({ queryClient, store, children }: AppProvidersProps) {
  return (
    <ReduxProvider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ReduxProvider>
  );
}
