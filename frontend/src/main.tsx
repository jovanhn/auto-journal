import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from '@tanstack/react-router';
import { AppProviders } from '@/app/AppProviders';
import { makeQueryClient } from '@/app/queryClient';
import { makeRouter } from '@/app/router';
import { makeStore } from '@/app/store';
import './index.css';

const queryClient = makeQueryClient();
const store = makeStore();
const router = makeRouter();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <AppProviders queryClient={queryClient} store={store}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
