import { useListPlannedExpenses } from '@/shared/api/generated/endpoints/planning/planning';

/** A vehicle's planned expenses, earliest due first, with the 12-month projection (BR-I5). */
export function usePlannedExpenses(vehicleId: string) {
  return useListPlannedExpenses(vehicleId);
}
