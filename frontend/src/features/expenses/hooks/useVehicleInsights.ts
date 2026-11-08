import {
  useGetVehicleAllTimeInsights,
  useGetVehicleInsights,
} from '@/shared/api/generated/endpoints/expenses/expenses';

/**
 * A vehicle's year figures (incl. that year's distance and cost per km) and lifetime car value, distance and
 * cost per km (specs/insights.md). Fetches only while [enabled].
 */
export function useVehicleInsights(vehicleId: string, year: number, enabled = true) {
  return useGetVehicleInsights(vehicleId, { year }, { query: { enabled } });
}

/** A vehicle's all-time figures (BR-I9) and lifetime figures; fetches only while [enabled]. */
export function useVehicleAllTimeInsights(vehicleId: string, enabled = true) {
  return useGetVehicleAllTimeInsights(vehicleId, { query: { enabled } });
}
