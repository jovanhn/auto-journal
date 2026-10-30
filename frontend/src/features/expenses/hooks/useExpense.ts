import { useGetExpense } from '@/shared/api/generated/endpoints/expenses/expenses';

export function useExpense(expenseId: string) {
  return useGetExpense(expenseId);
}
