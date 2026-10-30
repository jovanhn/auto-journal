import { useQueryClient } from '@tanstack/react-query';
import {
  getGetExpenseQueryKey,
  useUpdateExpense as useUpdateExpenseMutation,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Saves an expense, then refreshes it, its vehicle's lists, the Garage and the vehicle. */
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useUpdateExpenseMutation({
    mutation: {
      onSuccess: (expense, { expenseId }) =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetExpenseQueryKey(expenseId) }),
          invalidate(expense.vehicleId),
        ]),
    },
  });
}
