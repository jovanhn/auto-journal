import { useGetMe } from '@/shared/api/generated/endpoints/users/users';

/** The user's display currency: the default currency of new amounts (BR-C2). Shares the profile query. */
export function useDisplayCurrency() {
  return useGetMe({ query: { select: (profile) => profile.displayCurrency } });
}
