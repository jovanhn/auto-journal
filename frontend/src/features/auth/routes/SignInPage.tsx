import { getRouteApi } from '@tanstack/react-router';
import { signIn, signInWithGoogle } from '@/shared/auth/session';
import { AppLogo } from '@/shared/ui/AppLogo';
import { Separator } from '@/shared/ui/separator';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { SignInForm } from '../components/SignInForm';
import { safeRedirect } from '../redirect';
import type { SignInFormValues } from '../schemas';

const route = getRouteApi('/sign-in');

/**
 * Sign in with Google (any account; a new one becomes a new user) or with an email and password the owner
 * created in the Supabase dashboard. There is no email sign-up (specs/auth.md).
 */
export function SignInPage() {
  const { redirect } = route.useSearch();
  const navigate = route.useNavigate();
  const target = safeRedirect(redirect);

  const handleSignIn = async ({ email, password }: SignInFormValues) => {
    await signIn(email, password);
    await navigate({ href: target, replace: true });
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <AppLogo className="size-7" />
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">autojournal</p>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
      </div>
      <div className="flex flex-col gap-6">
        <GoogleSignInButton onSignIn={() => signInWithGoogle(target)} />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Separator className="flex-1" />
          <span>or with email</span>
          <Separator className="flex-1" />
        </div>
        <SignInForm onSubmit={handleSignIn} />
      </div>
    </main>
  );
}
