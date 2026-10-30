import { useGetMe } from '@/shared/api/generated/endpoints/users/users';

/** The signed-in user's profile (created by the backend on first call, BR-U3). */
export function useMe() {
  return useGetMe();
}
