import { Link } from '@tanstack/react-router';
import { ChartColumn, List } from 'lucide-react';

type VehicleTabBarProps = {
  vehicleId: string;
};

const tabClass = 'flex min-w-20 flex-col items-center justify-center gap-1 text-xs text-muted-foreground';
const activeProps = { className: 'font-semibold text-primary' } as const;
const activeOptions = { exact: true, includeSearch: false } as const;

/**
 * Bottom tab bar of the vehicle section (design.md, "Vehicle section" shell). Only the tabs that exist are
 * shown; Planned comes with specs/planned-expenses.md.
 */
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
        Expenses
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
    </nav>
  );
}
