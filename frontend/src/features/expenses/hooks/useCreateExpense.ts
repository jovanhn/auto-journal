import { useCreateExpense as useCreateExpenseMutation } from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Adds an expense to a vehicle, then refreshes its lists, the Garage and the vehicle. */
export function useCreateExpense() {
  const invalidate = useInvalidateExpenses();
  return useCreateExpenseMutation({
    mutation: { onSuccess: (_expense, { vehicleId }) => invalidate(vehicleId) },
  });
}
