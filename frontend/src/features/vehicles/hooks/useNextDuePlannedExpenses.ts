import { useListNextDuePlannedExpenses } from '@/shared/api/generated/endpoints/planning/planning';

/** The earliest planned expense of each vehicle that has plans, for the Garage cards. */
export function useNextDuePlannedExpenses() {
  return useListNextDuePlannedExpenses();
}
