import { useCreateLogEntry as useCreateLogEntryMutation } from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Adds a log entry to a vehicle, then refreshes its journal, the Garage and the vehicle (its odometer, BR-V5). */
export function useCreateLogEntry() {
  const invalidate = useInvalidateExpenses();
  return useCreateLogEntryMutation({
    mutation: { onSuccess: (_entry, { vehicleId }) => invalidate(vehicleId) },
  });
}
