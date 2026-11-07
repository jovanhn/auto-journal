import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { redirectTo } from '@/shared/lib/browser';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ConsentCard } from '../components/ConsentCard';
import { useAuthorizationDecision } from '../hooks/useAuthorizationDecision';
import { useAuthorizationRequest } from '../hooks/useAuthorizationRequest';

const route = getRouteApi('/oauth/consent');

/**
 * Consent step of Supabase's OAuth server (ADR 0018): an assistant such as Claude asks for access; the
 * signed-in user approves or denies and is sent back to it. No mock exists; it uses the sign-in layout.
 */
export function OAuthConsentPage() {
  const { authorization_id: authorizationId } = route.useSearch();
  const request = useAuthorizationRequest(authorizationId);
  const decision = useAuthorizationDecision(authorizationId ?? '');
  const alreadyApproved = request.data?.kind === 'redirect' ? request.data.redirectUrl : undefined;

  useEffect(() => {
    if (alreadyApproved) redirectTo(alreadyApproved);
  }, [alreadyApproved]);

  const content = () => {
    if (!authorizationId || request.isError) {
      return (
        <div className="flex flex-col gap-4">
          <ErrorState
            title="This authorization request is invalid or has expired"
            error={
              request.error ?? new Error('The link has no authorization request. Start again from the app.')
            }
          />
          <Link to="/" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Go to autojournal
          </Link>
        </div>
      );
    }
    if (request.isPending || request.data.kind === 'redirect') {
      return <LoadingState label="Loading the authorization request…" />;
    }
    return (
      <ConsentCard
        clientName={request.data.clientName}
        email={request.data.email}
        pending={decision.isPending || decision.isSuccess}
        errorMessage={decision.error ? 'Could not save your decision. Start again from the app.' : undefined}
        onApprove={() => {
          decision.mutate(true);
        }}
        onDeny={() => {
          decision.mutate(false);
        }}
      />
    );
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-8 px-5 py-10">
      <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">autojournal</p>
      {content()}
    </main>
  );
}
