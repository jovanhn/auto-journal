import { useQuery } from '@tanstack/react-query';
import { getAuthorizationRequest } from '@/shared/auth/session';

/** The assistant's OAuth authorization request (from Supabase Auth, not our API). Fetched once, never retried. */
export function useAuthorizationRequest(authorizationId: string | undefined) {
  return useQuery({
    queryKey: ['oauth-authorization', authorizationId],
    queryFn: () => getAuthorizationRequest(authorizationId ?? ''),
    enabled: Boolean(authorizationId),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });
}
