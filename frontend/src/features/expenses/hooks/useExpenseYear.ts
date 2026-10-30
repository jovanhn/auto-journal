import { useListExpenses } from '@/shared/api/generated/endpoints/expenses/expenses';

/** A vehicle's expenses of one year with the year and month totals (BR-I1). */
export function useExpenseYear(vehicleId: string, year: number) {
  return useListExpenses(vehicleId, { year });
}
