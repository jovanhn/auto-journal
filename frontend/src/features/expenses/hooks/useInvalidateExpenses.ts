import { useQueryClient } from '@tanstack/react-query';
import {
  getGetExpenseSummaryQueryKey,
  getGetVehicleAllTimeInsightsQueryKey,
  getGetVehicleInsightsQueryKey,
  getListExpensesQueryKey,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import {
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/**
 * Refreshes everything a journal change affects: the vehicle's journal years and insights, the Garage summary,
 * and the vehicle itself (its current odometer follows journal entry readings, BR-V5).
 */
export function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return (vehicleId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getGetVehicleInsightsQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getGetVehicleAllTimeInsightsQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getGetExpenseSummaryQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
    ]);
}
