/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
