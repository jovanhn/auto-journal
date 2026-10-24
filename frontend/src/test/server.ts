import { setupServer } from 'msw/node';

/** MSW server for component tests. Add per-test handlers with `server.use(...)`. */
export const server = setupServer();

/** Matches the API base URL configured for tests (vite.config.ts → test.env). */
export const api = (path: string) => `*/api${path}`;
