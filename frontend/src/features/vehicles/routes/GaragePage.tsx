import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { VehicleCard } from '../components/VehicleCard';
import { useVehicles } from '../hooks/useVehicles';

/** Garage (design screen 01). The all-cars summary and per-card spend come with specs/expenses.md. */
export function GaragePage() {
  const vehicles = useVehicles();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold tracking-tight">Garage</h1>

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
                  <VehicleCard vehicle={vehicle} />
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
