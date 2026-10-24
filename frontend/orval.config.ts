import { defineConfig } from 'orval';

// Generates TanStack Query hooks + Zod schemas from the API contract.
// Output (src/shared/api/generated/) is gitignored and regenerated before dev/build/test.
export default defineConfig({
  api: {
    input: { target: '../contracts/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: 'src/shared/api/generated/endpoints',
      schemas: 'src/shared/api/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: { path: 'src/shared/api/http.ts', name: 'http' },
        fetch: { includeHttpResponseReturnType: false },
      },
    },
  },
  zod: {
    input: { target: '../contracts/openapi.yaml' },
    output: {
      mode: 'tags-split',
      target: 'src/shared/api/generated/zod',
      client: 'zod',
      fileExtension: '.zod.ts',
      clean: true,
    },
  },
});
