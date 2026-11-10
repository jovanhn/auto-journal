import { Link } from '@tanstack/react-router';
import { CalendarDays, ChartColumn, List, TriangleAlert } from 'lucide-react';

type VehicleTabBarProps = {
  vehicleId: string;
};

const tabClass =
  'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground';
const activeProps = { className: 'font-semibold text-primary' } as const;
const activeOptions = { exact: true, includeSearch: false } as const;

/** Bottom tab bar of the vehicle section (design.md, "Vehicle section" shell): Journal, Insights, Planned, Issues. */
export function VehicleTabBar({ vehicleId }: VehicleTabBarProps) {
  return (
    <nav
      aria-label="Vehicle sections"
      className="fixed inset-x-0 bottom-0 z-10 flex h-18 justify-around border-t bg-card"
    >
      <Link
        to="/vehicles/$vehicleId"
        params={{ vehicleId }}
        className={tabClass}
        activeProps={activeProps}
        activeOptions={activeOptions}
      >
        <List className="size-[22px]" aria-hidden="true" />
        Journal
      </Link>
      <Link
        to="/vehicles/$vehicleId/insights"
        params={{ vehicleId }}
        className={tabClass}
        activeProps={activeProps}
        activeOptions={activeOptions}
      >
        <ChartColumn className="size-[22px]" aria-hidden="true" />
        Insights
      </Link>
      <Link
        to="/vehicles/$vehicleId/planned"
        params={{ vehicleId }}
        className={tabClass}
        activeProps={activeProps}
        activeOptions={activeOptions}
      >
        <CalendarDays className="size-[22px]" aria-hidden="true" />
        Planned
      </Link>
      <Link
        to="/vehicles/$vehicleId/issues"
        params={{ vehicleId }}
        className={tabClass}
        activeProps={activeProps}
        activeOptions={{ includeSearch: false }}
      >
        <TriangleAlert className="size-[22px]" aria-hidden="true" />
        Issues
      </Link>
    </nav>
  );
}
