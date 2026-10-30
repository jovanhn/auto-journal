import { useListVehicles } from '@/shared/api/generated/endpoints/vehicles/vehicles';

/** The signed-in user's vehicles, oldest first (BR-V8). */
export function useVehicles() {
  return useListVehicles();
}
