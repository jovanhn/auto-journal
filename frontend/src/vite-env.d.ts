/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API calls. Default `/api` (proxied to the backend by Vite). */
  readonly VITE_API_BASE_URL?: string;
  /** Supabase project URL, for auth only (ADR 0015). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (never the secret / service-role key). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** `false` hides the build-info footer on Settings; anything else shows it (specs/app-versioning.md). */
  readonly VITE_SHOW_BUILD_INFO?: string;
}

/** Build metadata inlined by vite.config.ts (`define`); read it through `@/shared/buildInfo`. */
declare const __BUILD_INFO__: {
  component: 'frontend';
  version: string;
  gitSha: string;
  buildId: string;
  buildTime: string;
};

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
