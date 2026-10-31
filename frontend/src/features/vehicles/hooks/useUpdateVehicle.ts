import { useQueryClient } from '@tanstack/react-query';
import { getGetVehicleInsightsQueryKey } from '@/shared/api/generated/endpoints/expenses/expenses';
import {
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
  useUpdateVehicle as useUpdateVehicleMutation,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** Saves a vehicle's data, then refreshes the Garage list, that vehicle and its insights (price, odometer). */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useUpdateVehicleMutation({
    mutation: {
      onSuccess: (_vehicle, { vehicleId }) =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) }),
          queryClient.invalidateQueries({ queryKey: getGetVehicleInsightsQueryKey(vehicleId) }),
        ]),
    },
  });
}
