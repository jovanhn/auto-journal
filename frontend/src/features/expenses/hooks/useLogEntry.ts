import { useGetLogEntry } from '@/shared/api/generated/endpoints/expenses/expenses';

export function useLogEntry(logEntryId: string) {
  return useGetLogEntry(logEntryId);
}
