import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { fakeAuth } from './fakeSession';
import { server } from './server';

// Component tests never call Supabase: the auth module is replaced by an in-memory fake.
vi.mock('@/shared/auth/session', () => import('./fakeSession'));

// jsdom does not implement matchMedia (used for the system color scheme by the app and sonner).
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList,
});

// The first render of a test file (cold module load) can take over the 1 s default under a parallel full run.
configure({ asyncUtilTimeout: 3000 });

// Every request must be handled explicitly by the test.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
beforeEach(() => {
  fakeAuth.signedIn();
});
afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
});
afterAll(() => {
  server.close();
});
