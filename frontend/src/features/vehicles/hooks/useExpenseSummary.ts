import { useGetExpenseSummary } from '@/shared/api/generated/endpoints/expenses/expenses';

/** This year's spend across all cars and per car, in the display currency (BR-I6). */
export function useExpenseSummary() {
  return useGetExpenseSummary();
}
