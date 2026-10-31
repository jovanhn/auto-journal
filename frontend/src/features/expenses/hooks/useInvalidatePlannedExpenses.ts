import { useQueryClient } from '@tanstack/react-query';
import {
  getListNextDuePlannedExpensesQueryKey,
  getListPlannedExpensesQueryKey,
} from '@/shared/api/generated/endpoints/planning/planning';

/** Refreshes everything a plan change affects: the vehicle's plans and projection, and the Garage next-due line. */
export function useInvalidatePlannedExpenses() {
  const queryClient = useQueryClient();
  return (vehicleId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListPlannedExpensesQueryKey(vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getListNextDuePlannedExpensesQueryKey() }),
    ]);
}
