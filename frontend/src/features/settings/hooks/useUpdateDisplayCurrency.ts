import { useQueryClient } from '@tanstack/react-query';
import { useUpdateMe } from '@/shared/api/generated/endpoints/users/users';

/**
 * Changes the display currency (BR-U4). Every total the backend returns is in the display currency,
 * so all cached queries are invalidated, not only the profile.
 */
export function useUpdateDisplayCurrency() {
  const queryClient = useQueryClient();
  return useUpdateMe({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries(),
    },
  });
}
