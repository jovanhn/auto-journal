/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API calls. Default `/api` (proxied to the backend by Vite). */
  readonly VITE_API_BASE_URL?: string;
  /** Supabase project URL, for auth only (ADR 0015). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase publishable key (never the secret / service-role key). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
