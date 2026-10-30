import { useQueryClient } from '@tanstack/react-query';
import {
  getGetExpenseQueryKey,
  useDeleteExpense as useDeleteExpenseMutation,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Deletes an expense of [vehicleId], then forgets it and refreshes the lists, the Garage and the vehicle. */
export function useDeleteExpense(vehicleId: string) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useDeleteExpenseMutation({
    mutation: {
      onSuccess: (_result, { expenseId }) => {
        queryClient.removeQueries({ queryKey: getGetExpenseQueryKey(expenseId) });
        return invalidate(vehicleId);
      },
    },
  });
}
