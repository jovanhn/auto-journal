/// <reference types="vitest/config" />
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Build metadata inlined as `__BUILD_INFO__` (specs/app-versioning.md, ADR 0023). The version comes from
 * scripts/version.sh; with RELEASE_BUILD=true (the frontend-deploy job) a missing tag or history fails the build.
 */
function buildInfo() {
  const release = process.env.RELEASE_BUILD === 'true';
  const run = (cmd: string, args: string[]): string =>
    execFileSync(cmd, args, {
      cwd: import.meta.dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  let version = '0.0.0-local';
  try {
    version = run('sh', ['../scripts/version.sh', 'frontend']);
  } catch (error) {
    if (release)
      throw new Error('Cannot compute the frontend version (see scripts/version.sh)', { cause: error });
  }
  let gitSha = process.env.GITHUB_SHA ?? '';
  if (!gitSha) {
    try {
      gitSha = run('git', ['rev-parse', 'HEAD']);
    } catch {
      gitSha = 'local';
    }
  }
  const { GITHUB_RUN_ID: runId, GITHUB_RUN_ATTEMPT: attempt } = process.env;
  return {
    component: 'frontend' as const,
    version,
    gitSha,
    buildId: runId ? `${runId}-${attempt ?? '1'}` : 'local',
    buildTime: new Date().toISOString(),
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __BUILD_INFO__: JSON.stringify(buildInfo()) },
  // One .env for the whole repo (repo root); only VITE_* variables reach the client.
  envDir: '..',
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Form tests type with userEvent; under a parallel full run they can exceed the 5 s default.
    testTimeout: 15_000,
    // Node's fetch needs absolute URLs; MSW handlers match */api/....
    env: { VITE_API_BASE_URL: 'http://localhost/api' },
  },
});
