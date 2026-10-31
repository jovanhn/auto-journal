import { Link } from '@tanstack/react-router';
import { ChevronLeft, Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

type VehicleAppBarProps = {
  vehicleId: string;
  /** The nickname; undefined while loading. */
  title: string | undefined;
  subtitle: string | undefined;
};

/** App bar of the vehicle section (design.md, "Vehicle section" shell): back to Garage, name, Edit vehicle. */
export function VehicleAppBar({ vehicleId, title, subtitle }: VehicleAppBarProps) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="-ml-3 size-11" asChild>
        <Link to="/" aria-label="Back to garage">
          <ChevronLeft className="size-[22px]" aria-hidden="true" />
        </Link>
      </Button>
      <div className="flex min-w-0 flex-1 flex-col">
        {title === undefined ? (
          <Skeleton className="h-6 w-40" />
        ) : (
          <>
            <h1 className="truncate text-xl font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground tabular-nums">{subtitle}</p>}
          </>
        )}
      </div>
      <Button variant="ghost" size="icon" className="size-11" asChild>
        <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId }} aria-label="Edit vehicle">
          <Pencil aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}
