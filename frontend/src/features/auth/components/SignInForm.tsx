import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { InvalidCredentialsError } from '@/shared/auth/errors';
import { ROOT_SERVER_ERROR } from '@/shared/lib/form';
import { Button } from '@/shared/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/shared/ui/field';
import { FormErrorAlert } from '@/shared/ui/FormErrorAlert';
import { Input } from '@/shared/ui/input';
import { signInFormSchema, type SignInFormInput, type SignInFormValues } from '../schemas';

type SignInFormProps = {
  /** Signs in; a rejected promise is shown as a form-level error. */
  onSubmit: (values: SignInFormValues) => Promise<unknown>;
};

export function SignInForm({ onSubmit }: SignInFormProps) {
  const form = useForm<SignInFormInput, unknown, SignInFormValues>({
    resolver: zodResolver(signInFormSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (error) {
      // One generic message for wrong email or password; never reveal which one (specs/auth.md, AC 9).
      const message =
        error instanceof InvalidCredentialsError
          ? error.message
          : 'Could not sign in. Check your connection and try again.';
      form.setError(ROOT_SERVER_ERROR, { type: 'server', message });
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate aria-label="Sign in">
      <FieldGroup>
        <FormErrorAlert message={form.formState.errors.root?.server?.message} />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
              <Input
                {...field}
                id="sign-in-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
              <Input
                {...field}
                id="sign-in-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </FieldGroup>
    </form>
  );
}
