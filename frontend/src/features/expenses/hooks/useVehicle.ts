import { useGetVehicle } from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** The vehicle shown in the Expenses app bar. Shares the query with the vehicles feature. */
export function useVehicle(vehicleId: string) {
  return useGetVehicle(vehicleId);
}
