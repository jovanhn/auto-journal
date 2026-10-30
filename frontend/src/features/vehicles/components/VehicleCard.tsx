import { Link } from '@tanstack/react-router';
import { Car } from 'lucide-react';
import type { Vehicle } from '@/shared/api/generated/model';
import { formatKm, formatMoney } from '@/shared/lib/money';

type VehicleCardProps = {
  vehicle: Vehicle;
};

/** Garage card (design: `VehicleCard`); the whole card links to the vehicle. Spend and next-due come later. */
export function VehicleCard({ vehicle }: VehicleCardProps) {
  return (
    <Link
      to="/vehicles/$vehicleId"
      params={{ vehicleId: vehicle.id }}
      className="flex items-center gap-3 rounded-2xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
        <Car aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[17px] font-semibold">{vehicle.nickname}</span>
        <span className="truncate text-sm text-muted-foreground tabular-nums">
          {vehicle.make} {vehicle.model} · {vehicle.year} · {formatKm(vehicle.currentOdometer)}
        </span>
        <span className="text-sm text-muted-foreground">
          Value <span className="font-medium text-foreground tabular-nums">{formatMoney(vehicle.value)}</span>
        </span>
      </span>
    </Link>
  );
}
