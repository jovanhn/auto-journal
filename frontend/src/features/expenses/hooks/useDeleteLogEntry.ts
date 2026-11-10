import { useQueryClient } from '@tanstack/react-query';
import {
  getGetLogEntryQueryKey,
  useDeleteLogEntry as useDeleteLogEntryMutation,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Deletes a log entry of [vehicleId], then forgets it and refreshes the journal, insights and odometer (BR-J4). */
export function useDeleteLogEntry(vehicleId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useDeleteLogEntryMutation({
    mutation: {
      onSuccess: (_result, { logEntryId }) => {
        queryClient.removeQueries({ queryKey: getGetLogEntryQueryKey(logEntryId) });
        return invalidate(vehicleId);
      },
    },
  });
}
