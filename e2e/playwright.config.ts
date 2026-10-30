import { defineConfig, devices } from '@playwright/test';
import { FRONTEND_URL, STORAGE_STATE } from './fixtures/urls';

/**
 * E2E for critical user flows only (see CRITICAL_FLOWS.md).
 *
 * `webServer` starts the full stack. Build first (`make e2e` does this):
 *   - Postgres via docker-compose (in CI, a service container already listens on :5432 and is reused)
 *   - backend: the jar built by `./mvnw -DskipTests package`
 *   - frontend: the production build served by `vite preview` (proxies /api to :8080)
 */
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['html', { open: 'never' }], ['github']] : [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: FRONTEND_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Signs the E2E user in once (E2E_USER_EMAIL / E2E_USER_PASSWORD); the other tests reuse the session.
    { name: 'setup', testMatch: 'auth.setup.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      testMatch: ['seed.spec.ts', 'tests/**/*.spec.ts'],
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE },
    },
  ],
  webServer: [
    {
      name: 'postgres',
      command: 'docker compose up postgres',
      cwd: '..',
      port: 5432,
      // Reuse `make db-up` locally and the service container in CI.
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      name: 'backend',
      command: 'java -jar target/autojournal-0.0.1-SNAPSHOT.jar',
      cwd: '../backend',
      url: 'http://localhost:8080/actuator/health',
      reuseExistingServer: !isCI,
      timeout: 180_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      name: 'frontend',
      command: 'pnpm exec vite preview --port 4173 --strictPort',
      cwd: '../frontend',
      url: FRONTEND_URL,
      reuseExistingServer: !isCI,
      timeout: 60_000,
    },
  ],
});
