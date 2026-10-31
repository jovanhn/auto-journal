import { useUpdatePlannedExpense as useUpdatePlannedExpenseMutation } from '@/shared/api/generated/endpoints/planning/planning';
import { useInvalidatePlannedExpenses } from './useInvalidatePlannedExpenses';

/** Saves a plan, then refreshes its vehicle's plans and the Garage. */
export function useUpdatePlannedExpense() {
  const invalidate = useInvalidatePlannedExpenses();
  return useUpdatePlannedExpenseMutation({
    mutation: { onSuccess: (plan) => invalidate(plan.vehicleId) },
  });
}
