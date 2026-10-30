import { useQueryClient } from '@tanstack/react-query';
import {
  getListVehiclesQueryKey,
  useCreateVehicle as useCreateVehicleMutation,
} from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** Adds a vehicle, then refreshes the Garage list. */
export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useCreateVehicleMutation({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() }),
    },
  });
}
