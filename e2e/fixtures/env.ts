import { existsSync } from 'node:fs';
import path from 'node:path';

// Locally the repo-root .env provides the values; in CI they are real env vars (which win).
const dotenv = path.resolve(import.meta.dirname, '../../.env');
if (existsSync(dotenv)) process.loadEnvFile(dotenv);

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set (see .env.example).`);
  return value;
};

/** The E2E test user: an existing Supabase Auth user (there is no sign-up, specs/auth.md). */
export const e2eUser = () => ({ email: required('E2E_USER_EMAIL'), password: required('E2E_USER_PASSWORD') });

export const supabase = () => ({
  url: required('VITE_SUPABASE_URL'),
  publishableKey: required('VITE_SUPABASE_PUBLISHABLE_KEY'),
});
