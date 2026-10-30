import { useQueryClient } from '@tanstack/react-query';
import {
  getGetExpenseSummaryQueryKey,
  getListExpensesQueryKey,
} from '@/shared/api/generated/endpoints/expenses/expenses';
import {
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/**
 * Refreshes everything an expense change affects: the vehicle's year lists, the Garage summary, and the
 * vehicle itself (its current odometer follows expense readings, BR-V5).
 */
export function useInvalidateExpenses() {
  const queryClient = useQueryClient();
  return (vehicleId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getGetExpenseSummaryQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
    ]);
}
