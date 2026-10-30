import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { VehicleForm } from '../components/VehicleForm';
import { useCreateVehicle } from '../hooks/useCreateVehicle';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { toVehicleRequest, type VehicleFormValues } from '../schemas';

/** Add vehicle (design screen 06). The price currency defaults to the display currency (BR-C2). */
export function AddVehiclePage() {
  const navigate = useNavigate();
  const displayCurrency = useDisplayCurrency();
  const createVehicle = useCreateVehicle();

  const handleCreate = async (values: VehicleFormValues) => {
    const vehicle = await createVehicle.mutateAsync({ data: toVehicleRequest(values) });
    toast.success(`${vehicle.nickname} added to your garage`);
    await navigate({ to: '/' });
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="New vehicle" cancelTo={{ to: '/' }} />
      {displayCurrency.isPending ? (
        <LoadingState label="Loading…" rows={5} />
      ) : displayCurrency.isError ? (
        <ErrorState
          title="Could not load the form"
          error={displayCurrency.error}
          onRetry={() => void displayCurrency.refetch()}
        />
      ) : (
        <VehicleForm
          label="New vehicle"
          defaultValues={{
            nickname: '',
            make: '',
            model: '',
            year: '',
            plate: '',
            odometerAtStart: '',
            purchasePrice: { amount: '', currency: displayCurrency.data },
            purchaseDate: '',
          }}
          submitLabel="Add to garage"
          submittingLabel="Adding…"
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
