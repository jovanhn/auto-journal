import { useQueryClient } from '@tanstack/react-query';
import {
  getGetVehicleQueryKey,
  getListVehiclesQueryKey,
  useDeleteVehicle as useDeleteVehicleMutation,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** Deletes a vehicle (and everything recorded for it, BR-V6), then forgets it and refreshes the Garage. */
export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useDeleteVehicleMutation({
    mutation: {
      onSuccess: (_result, { vehicleId }) => {
        queryClient.removeQueries({ queryKey: getGetVehicleQueryKey(vehicleId) });
        return queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() });
      },
    },
  });
}
