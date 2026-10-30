import { getRouteApi } from '@tanstack/react-router';
import { signIn } from '@/shared/auth/session';
import { SignInForm } from '../components/SignInForm';
import type { SignInFormValues } from '../schemas';

const route = getRouteApi('/sign-in');

/** Only same-app paths are followed after sign-in (no open redirects). */
const safeRedirect = (target: string | undefined): string =>
  target?.startsWith('/') && !target.startsWith('//') ? target : '/';

/** Sign in with email and password. There is no sign-up: the owner creates accounts (specs/auth.md). */
export function SignInPage() {
  const { redirect } = route.useSearch();
  const navigate = route.useNavigate();

  const handleSignIn = async ({ email, password }: SignInFormValues) => {
    await signIn(email, password);
    await navigate({ href: safeRedirect(redirect), replace: true });
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">autojournal</p>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      </div>
      <SignInForm onSubmit={handleSignIn} />
    </main>
  );
}
