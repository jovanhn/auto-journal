import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { PlannedExpenseList } from '@/shared/api/generated/model';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { PlannedExpenseCard } from '../components/PlannedExpenseCard';
import { ProjectionHero } from '../components/ProjectionHero';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { usePlannedExpenses } from '../hooks/usePlannedExpenses';
import { useVehicle } from '../hooks/useVehicle';
import { todayIso } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/planned');

/**
 * Vehicle · Planned (design screen 04): the 12-month projection from planned expenses only, the upcoming plans
 * earliest first with Mark as paid, and Plan an expense (specs/planned-expenses.md).
 */
export function PlannedPage() {
  const { vehicleId } = route.useParams();
  const vehicle = useVehicle(vehicleId);
  const plans = usePlannedExpenses(vehicleId);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle="Planned expenses"
      />
      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : plans.isPending ? (
        <LoadingState label="Loading planned expenses…" rows={5} />
      ) : plans.isError ? (
        <ErrorState
          title="Could not load the planned expenses"
          error={plans.error}
          onRetry={() => void plans.refetch()}
        />
      ) : (
        <PlannedView vehicleId={vehicleId} data={plans.data} />
      )}
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

type PlannedViewProps = {
  vehicleId: string;
  data: PlannedExpenseList;
};

function PlannedView({ vehicleId, data }: PlannedViewProps) {
  const today = todayIso();
  return (
    <>
      <ProjectionHero total={data.projectionTotal} />
      <section aria-labelledby="upcoming" className="flex flex-col gap-3">
        <h2 id="upcoming" className="px-1 text-sm font-semibold text-muted-foreground">
          Upcoming
        </h2>
        {data.items.length === 0 ? (
          <EmptyState
            title="Nothing planned yet"
            description="Plan upcoming costs like insurance or registration so they don't surprise you."
          />
        ) : (
          <ul aria-label="Planned expenses" className="flex flex-col gap-3">
            {data.items.map((plan) => (
              <li key={plan.id}>
                <PlannedExpenseCard plan={plan} today={today} />
              </li>
            ))}
          </ul>
        )}
        <Link
          to="/vehicles/$vehicleId/planned/new"
          params={{ vehicleId }}
          className="flex h-13 items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-border-dashed font-medium transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Plus className="size-[18px]" aria-hidden="true" />
          Plan an expense
        </Link>
      </section>
    </>
  );
}
