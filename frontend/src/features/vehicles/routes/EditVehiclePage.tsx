import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Vehicle } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { DeleteVehicleButton } from '../components/DeleteVehicleButton';
import { VehicleForm } from '../components/VehicleForm';
import { useDeleteVehicle } from '../hooks/useDeleteVehicle';
import { useUpdateVehicle } from '../hooks/useUpdateVehicle';
import { useVehicle } from '../hooks/useVehicle';
import { toVehicleRequest, type VehicleFormInput, type VehicleFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/edit');

const toFormInput = (vehicle: Vehicle): VehicleFormInput => ({
  nickname: vehicle.nickname,
  make: vehicle.make,
  model: vehicle.model,
  year: String(vehicle.year),
  plate: vehicle.plate ?? '',
  odometerAtStart: String(vehicle.odometerAtStart),
  purchasePrice: { ...vehicle.purchasePrice },
  purchaseDate: vehicle.purchaseDate,
});

/**
 * Edit vehicle: the Add vehicle form, pre-filled, with Delete at the bottom (opened from the vehicle's app bar,
 * specs/expenses.md UI notes).
 */
export function EditVehiclePage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const vehicle = useVehicle(vehicleId);
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();
  const backToVehicle = { to: '/vehicles/$vehicleId', params: { vehicleId } } as const;

  const handleSave = async (values: VehicleFormValues) => {
    await updateVehicle.mutateAsync({ vehicleId, data: toVehicleRequest(values) });
    toast.success('Changes saved');
    await navigate(backToVehicle);
  };

  const handleDelete = async (nickname: string) => {
    try {
      await deleteVehicle.mutateAsync({ vehicleId });
      toast.success(`${nickname} deleted`);
      await navigate({ to: '/' });
    } catch {
      toast.error(`Could not delete ${nickname}. Please try again.`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit vehicle" cancelTo={backToVehicle} />
      {vehicle.isPending ? (
        <LoadingState label="Loading vehicle…" rows={5} />
      ) : vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : (
        <VehicleForm
          label="Edit vehicle"
          defaultValues={toFormInput(vehicle.data)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSave}
          footer={
            <DeleteVehicleButton
              nickname={vehicle.data.nickname}
              deleting={deleteVehicle.isPending}
              onConfirm={() => void handleDelete(vehicle.data.nickname)}
            />
          }
        />
      )}
    </div>
  );
}
