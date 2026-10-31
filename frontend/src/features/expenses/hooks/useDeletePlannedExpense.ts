import { useDeletePlannedExpense as useDeletePlannedExpenseMutation } from '@/shared/api/generated/endpoints/planning/planning';
import { useInvalidatePlannedExpenses } from './useInvalidatePlannedExpenses';

/** Deletes a plan of [vehicleId] without paying it, then refreshes its plans and the Garage. */
export function useDeletePlannedExpense(vehicleId: string) {
  const invalidate = useInvalidatePlannedExpenses();
  return useDeletePlannedExpenseMutation({
    mutation: { onSuccess: () => invalidate(vehicleId) },
  });
}
