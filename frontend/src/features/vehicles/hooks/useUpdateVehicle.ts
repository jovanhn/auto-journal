import { useQueryClient } from '@tanstack/react-query';
import {
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
  useUpdateVehicle as useUpdateVehicleMutation,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** Saves a vehicle's data, then refreshes the Garage list and that vehicle. */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useUpdateVehicleMutation({
    mutation: {
      onSuccess: (_vehicle, { vehicleId }) =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetVehicleQueryKey(vehicleId) }),
        ]),
    },
  });
}
