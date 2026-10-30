import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { ExpenseSummary, Money } from '@/shared/api/generated/model';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Skeleton } from '@/shared/ui/skeleton';
import { HeroSummary } from '../components/HeroSummary';
import { VehicleCard } from '../components/VehicleCard';
import { useExpenseSummary } from '../hooks/useExpenseSummary';
import { useVehicles } from '../hooks/useVehicles';

/** A vehicle without expenses this year is missing from the summary: it spent 0 (specs/expenses.md, AC 10). */
const yearTotalOf = (summary: ExpenseSummary, vehicleId: string): Money =>
  summary.vehicles.find((entry) => entry.vehicleId === vehicleId)?.total ?? {
    amount: '0.00',
    currency: summary.total.currency,
  };

/** Garage (design screen 01): the all-cars hero for this year, then the vehicle cards with their spend. */
export function GaragePage() {
  const vehicles = useVehicles();
  const summary = useExpenseSummary();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Garage</h1>

      {summary.isPending || vehicles.isPending ? (
        <div role="status" aria-label="Loading this year's totals">
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : summary.isError ? (
        <ErrorState
          title="Could not load this year's totals"
          error={summary.error}
          onRetry={() => void summary.refetch()}
        />
      ) : vehicles.isSuccess && vehicles.data.length > 0 ? (
        <HeroSummary summary={summary.data} vehicleCount={vehicles.data.length} />
      ) : null}

      <section aria-labelledby="vehicle-list-heading" className="flex flex-col gap-3">
        <h2 id="vehicle-list-heading" className="text-sm font-semibold text-muted-foreground">
          Your vehicles
        </h2>
        {vehicles.isPending ? (
          <LoadingState label="Loading vehicles…" />
        ) : vehicles.isError ? (
          <ErrorState
            title="Could not load your vehicles"
            error={vehicles.error}
            onRetry={() => void vehicles.refetch()}
          />
        ) : vehicles.data.length === 0 ? (
          <EmptyState
            title="No vehicles yet"
            description="Add your first car to start tracking what it costs."
            action={
              <Button asChild className="mt-2">
                <Link to="/vehicles/new">Add your first vehicle</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="flex flex-col gap-3" aria-label="Vehicles">
              {vehicles.data.map((vehicle) => (
                <li key={vehicle.id}>
                  <VehicleCard
                    vehicle={vehicle}
                    yearTotal={summary.isSuccess ? yearTotalOf(summary.data, vehicle.id) : undefined}
                  />
                </li>
              ))}
            </ul>
            <Link
              to="/vehicles/new"
              className="flex h-13 items-center justify-center gap-2 rounded-2xl border border-dashed border-border-dashed font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Plus className="size-[18px]" aria-hidden="true" />
              Add vehicle
            </Link>
          </>
        )}
      </section>
    </div>
  );
}
