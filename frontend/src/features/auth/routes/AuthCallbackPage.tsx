import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { AppLogo } from '@/shared/ui/AppLogo';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';

/** Shown while the Google sign-in code is exchanged for a session. */
export function AuthCallbackPending() {
  return (
    <CallbackLayout>
      <LoadingState label="Signing in…" />
    </CallbackLayout>
  );
}

/**
 * Google sign-in did not complete: the user cancelled, Google or Supabase returned an error, or the link
 * was already used. A successful callback never renders this page; the route redirects instead.
 */
export function AuthCallbackPage() {
  return (
    <CallbackLayout>
      <div className="flex flex-col gap-4">
        <ErrorState
          title="Could not sign in with Google"
          error={new Error('The sign-in was cancelled or has expired. Try again.')}
        />
        <Link to="/sign-in" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    </CallbackLayout>
  );
}

function CallbackLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <div className="flex items-center gap-2">
        <AppLogo className="size-7" />
        <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">autojournal</p>
      </div>
      {children}
    </main>
  );
}
