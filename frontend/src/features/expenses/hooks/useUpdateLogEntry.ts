import { useQueryClient } from '@tanstack/react-query';
import {
  getGetLogEntryQueryKey,
  useUpdateLogEntry as useUpdateLogEntryMutation,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Saves a log entry, then refreshes it, its vehicle's journal, insights and odometer (BR-J4). */
export function useUpdateLogEntry() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useUpdateLogEntryMutation({
    mutation: {
      onSuccess: (entry, { logEntryId }) =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetLogEntryQueryKey(logEntryId) }),
          invalidate(entry.vehicleId),
        ]),
    },
  });
}
