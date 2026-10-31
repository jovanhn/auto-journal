import { Link } from '@tanstack/react-router';
import { CalendarDays, Car } from 'lucide-react';
import type { Money, PlannedExpense, Vehicle } from '@/shared/api/generated/model';
import { CATEGORY_LABELS } from '@/shared/lib/categories';
import { mediumDate } from '@/shared/lib/dates';
import { formatKm, formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';

type VehicleCardProps = {
  vehicle: Vehicle;
  /** This year's spend in the display currency; not shown while the summary is unavailable. */
  yearTotal?: Money;
  /** The vehicle's earliest planned expense; no footer line without one. */
  nextDue?: PlannedExpense;
};

/**
 * Garage card (design: `VehicleCard`); the whole card links to the vehicle. The footer shows the next planned
 * expense, in the warning color when it is due soon (specs/planned-expenses.md, AC 10).
 */
export function VehicleCard({ vehicle, yearTotal, nextDue }: VehicleCardProps) {
  return (
    <Link
      to="/vehicles/$vehicleId"
      params={{ vehicleId: vehicle.id }}
      className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
          <Car aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[17px] font-semibold">{vehicle.nickname}</span>
          <span className="truncate text-sm text-muted-foreground tabular-nums">
            {vehicle.make} {vehicle.model} · {vehicle.year} · {formatKm(vehicle.currentOdometer)}
          </span>
          <span className="text-sm text-muted-foreground">
            Value{' '}
            <span className="font-medium text-foreground tabular-nums">{formatMoney(vehicle.value)}</span>
          </span>
        </span>
        {yearTotal && (
          <span className="flex shrink-0 flex-col items-end gap-0.5 self-start">
            <span className="text-[17px] font-semibold tabular-nums">{formatMoney(yearTotal)}</span>
            <span className="text-xs text-muted-foreground">this year</span>
          </span>
        )}
      </span>
      {nextDue && (
        <span
          className={cn(
            'flex items-center gap-2 border-t border-divider pt-3 text-sm',
            nextDue.dueSoon ? 'text-warning' : 'text-muted-foreground',
          )}
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          <span>
            <span className="sr-only">Next planned: </span>
            {CATEGORY_LABELS[nextDue.category]} · {mediumDate(nextDue.dueDate)}
          </span>
        </span>
      )}
    </Link>
  );
}
