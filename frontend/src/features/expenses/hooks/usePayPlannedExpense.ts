import { usePayPlannedExpense as usePayPlannedExpenseMutation } from '@/shared/api/generated/endpoints/planning/planning';
import { useInvalidateExpenses } from './useInvalidateExpenses';
import { useInvalidatePlannedExpenses } from './useInvalidatePlannedExpenses';

/** Marks a plan as paid (BR-PL2, BR-PL3), then refreshes the plans and everything the new expense affects. */
export function usePayPlannedExpense() {
  const invalidatePlans = useInvalidatePlannedExpenses();
  const invalidateExpenses = useInvalidateExpenses();
  return usePayPlannedExpenseMutation({
    mutation: {
      onSuccess: (expense) =>
        Promise.all([invalidatePlans(expense.vehicleId), invalidateExpenses(expense.vehicleId)]),
    },
  });
}
