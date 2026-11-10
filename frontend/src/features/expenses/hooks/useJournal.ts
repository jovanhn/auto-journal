import { useListJournal } from '@/shared/api/generated/endpoints/expenses/expenses';

/** A vehicle's whole journal, all years, without totals (specs/journal-filters.md, BR-J6). */
export function useJournal(vehicleId: string) {
  return useListJournal(vehicleId);
}
