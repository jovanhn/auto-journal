import { useGetVehicle } from '@/shared/api/generated/endpoints/vehicles/vehicles';

export function useVehicle(vehicleId: string) {
  return useGetVehicle(vehicleId);
}
