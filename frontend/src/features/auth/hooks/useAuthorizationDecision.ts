import { useMutation } from '@tanstack/react-query';
import { decideAuthorization } from '@/shared/auth/session';
import { redirectTo } from '@/shared/lib/browser';

/** Approves or denies the request, then sends the user back to the client (Claude). */
export function useAuthorizationDecision(authorizationId: string) {
  return useMutation({
    mutationFn: (approve: boolean) => decideAuthorization(authorizationId, approve),
    onSuccess: (redirectUrl) => {
      redirectTo(redirectUrl);
    },
  });
}
