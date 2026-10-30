import { Link } from '@tanstack/react-router';
import { List } from 'lucide-react';

type VehicleTabBarProps = {
  vehicleId: string;
};

/**
 * Bottom tab bar of the vehicle section (design.md, "Vehicle section" shell). Only the tabs that exist are
 * shown; Insights and Planned come with their specs (specs/expenses.md, UI notes).
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
        className="flex min-w-20 flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
        activeProps={{ className: 'font-semibold text-primary' }}
        activeOptions={{ exact: true, includeSearch: false }}
      >
        <List className="size-[22px]" aria-hidden="true" />
        Expenses
      </Link>
    </nav>
  );
}
