import { z } from 'zod';

/** Sign-in is not part of the API contract (Supabase Auth), so this schema is UI-only. */
export const signInFormSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Password is required'),
});

export type SignInFormInput = z.input<typeof signInFormSchema>;
export type SignInFormValues = z.output<typeof signInFormSchema>;
