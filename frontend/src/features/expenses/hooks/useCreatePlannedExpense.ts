import { useCreatePlannedExpense as useCreatePlannedExpenseMutation } from '@/shared/api/generated/endpoints/planning/planning';
import { useInvalidatePlannedExpenses } from './useInvalidatePlannedExpenses';

/** Plans an expense for a vehicle, then refreshes its plans and the Garage. */
export function useCreatePlannedExpense() {
  const invalidate = useInvalidatePlannedExpenses();
  return useCreatePlannedExpenseMutation({
    mutation: { onSuccess: (_plan, { vehicleId }) => invalidate(vehicleId) },
  });
}
