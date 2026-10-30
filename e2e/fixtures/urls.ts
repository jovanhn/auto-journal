/** Where `webServer` (playwright.config.ts) serves the stack. */
export const FRONTEND_URL = 'http://localhost:4173';
export const API_URL = 'http://localhost:8080/api';

/** Signed-in browser state written by auth.setup.ts (gitignored). */
export const STORAGE_STATE = '.auth/user.json';

/** Home (the Garage) is `/`; match the path only, ignoring any search params. */
export const isHome = (url: URL) => url.pathname === '/';
/** Sign-in is `/sign-in`; a guarded redirect adds `?redirect=<original path>`. */
export const isSignIn = (url: URL) => url.pathname === '/sign-in';
