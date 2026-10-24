/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for API calls. Default `/api` (proxied to the backend by Vite). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
