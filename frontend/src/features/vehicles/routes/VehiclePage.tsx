import { getRouteApi, Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';
import { formatKm, formatMoney, formatMoneyExact } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeleteVehicleButton } from '../components/DeleteVehicleButton';
import { useDeleteVehicle } from '../hooks/useDeleteVehicle';
import { useVehicle } from '../hooks/useVehicle';

const route = getRouteApi('/_app/vehicles/$vehicleId');

/**
 * The vehicle page. Its Expenses/Insights/Planned tabs come with later specs; until then it shows the
 * vehicle's data with Edit and Delete (specs/vehicles.md, UI notes).
 */
export function VehiclePage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const vehicle = useVehicle(vehicleId);
  const deleteVehicle = useDeleteVehicle();

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
      <Link
        to="/"
        className="-ml-2 flex items-center gap-1 self-start py-2 pr-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Garage
      </Link>
      {vehicle.isPending ? (
        <LoadingState label="Loading vehicle…" rows={4} />
      ) : vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{vehicle.data.nickname}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              {vehicle.data.make} {vehicle.data.model} · {vehicle.data.year} ·{' '}
              {formatKm(vehicle.data.currentOdometer)}
            </p>
          </div>

          <Card>
            <CardContent>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                <dt className="text-muted-foreground">Value</dt>
                <dd className="font-medium tabular-nums">{formatMoney(vehicle.data.value)}</dd>
                <dt className="text-muted-foreground">Purchase price</dt>
                <dd className="tabular-nums">{formatMoneyExact(vehicle.data.purchasePrice)}</dd>
                <dt className="text-muted-foreground">Date bought</dt>
                <dd className="tabular-nums">{vehicle.data.purchaseDate}</dd>
                <dt className="text-muted-foreground">Odometer at start</dt>
                <dd className="tabular-nums">{formatKm(vehicle.data.odometerAtStart)}</dd>
                <dt className="text-muted-foreground">Plate</dt>
                <dd className="font-mono">{vehicle.data.plate ?? '—'}</dd>
              </dl>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId }}>
                Edit
              </Link>
            </Button>
            <DeleteVehicleButton
              nickname={vehicle.data.nickname}
              deleting={deleteVehicle.isPending}
              onConfirm={() => void handleDelete(vehicle.data.nickname)}
            />
          </div>
        </>
      )}
    </div>
  );
}
