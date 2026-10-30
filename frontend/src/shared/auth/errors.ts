/** Wrong email or password. The UI shows one generic message for both (specs/auth.md, AC 9). */
export class InvalidCredentialsError extends Error {
  constructor() {
    super('Email or password is incorrect');
    this.name = 'InvalidCredentialsError';
  }
}

/** The signed-in user as the app needs it. Identity itself lives in Supabase Auth (ADR 0013). */
export type AuthSession = {
  email: string;
  accessToken: string;
};
