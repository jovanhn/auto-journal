import { useQueryClient } from '@tanstack/react-query';
import {
  getGetExpenseQueryKey,
  getGetLogEntryQueryKey,
  useConvertExpenseToLogEntry as useConvertExpenseToLogEntryMutation,
  useConvertLogEntryToExpense as useConvertLogEntryToExpenseMutation,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import { useInvalidateExpenses } from './useInvalidateExpenses';

/** Turns a log entry into an expense (BR-J5); forgets the log entry and refreshes the journal, totals and vehicle. */
export function useConvertLogEntryToExpense() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useConvertLogEntryToExpenseMutation({
    mutation: {
      onSuccess: (expense, { logEntryId }) => {
        queryClient.removeQueries({ queryKey: getGetLogEntryQueryKey(logEntryId) });
        return invalidate(expense.vehicleId);
      },
    },
  });
}

/** Turns an expense into a log entry, removing its cost (BR-J5); forgets the expense and refreshes the journal. */
export function useConvertExpenseToLogEntry() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExpenses();
  return useConvertExpenseToLogEntryMutation({
    mutation: {
      onSuccess: (entry, { expenseId }) => {
        queryClient.removeQueries({ queryKey: getGetExpenseQueryKey(expenseId) });
        return invalidate(entry.vehicleId);
      },
    },
  });
}
