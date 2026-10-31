import { useGetVehicleInsights } from '@/shared/api/generated/endpoints/expenses/expenses';

/** A vehicle's year figures and lifetime car value, distance and cost per km (specs/insights.md). */
export function useVehicleInsights(vehicleId: string, year: number) {
  return useGetVehicleInsights(vehicleId, { year });
}
