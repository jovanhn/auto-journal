import { getRouteApi, Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import type { ExpenseYear, Money } from '@/shared/api/generated/model';
import { formatKm, formatMoney, formatMoneyCents } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { JournalMonthGroup } from '../components/JournalMonthGroup';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { StatTile } from '../components/StatTile';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { monthIndexOf } from '@/shared/lib/dates';
import { journalItems } from '../journal';
import { metricInfo } from '../metricInfo';
import { useExpenseYear } from '../hooks/useExpenseYear';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleInsights } from '../hooks/useVehicleInsights';

const route = getRouteApi('/_app/vehicles/$vehicleId');

/**
 * Vehicle · Journal (design screen 02, specs/journal.md): app bar with Edit vehicle, This year / This month / Per km
 * tiles (expenses only), the year switcher, the year's expenses and log entries grouped by month (newest first),
 * and the Add FAB.
 */
export function VehicleExpensesPage() {
  const { vehicleId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const currentYear = new Date().getFullYear();
  const year = Math.min(search.year ?? currentYear, currentYear);
  const vehicle = useVehicle(vehicleId);
  const expenses = useExpenseYear(vehicleId, year);
  // Per km is lifetime (BR-I4), so any year's insights carry it; reuse the selected year's query.
  const insights = useVehicleInsights(vehicleId, year);

  const changeYear = (next: number) =>
    void navigate({ search: next === currentYear ? {} : { year: next }, replace: true });

  return (
    <div className="flex flex-col gap-4 pb-36">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle={
          vehicle.isSuccess
            ? `${vehicle.data.make} ${vehicle.data.model} · ${vehicle.data.year} · ${formatKm(vehicle.data.currentOdometer)}`
            : undefined
        }
      />

      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : expenses.isPending ? (
        <LoadingState label="Loading journal…" rows={5} />
      ) : expenses.isError ? (
        <ErrorState
          title="Could not load the journal"
          error={expenses.error}
          onRetry={() => void expenses.refetch()}
        />
      ) : (
        <ExpenseYearView
          data={expenses.data}
          isCurrentYear={year === currentYear}
          currentYear={currentYear}
          onYearChange={changeYear}
          vehicleId={vehicleId}
          costPerKm={insights.isSuccess ? insights.data.costPerKm : null}
        />
      )}

      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-24 z-10 h-13 rounded-full px-5 shadow-[0_4px_14px_rgb(22_24_29/0.18)]"
      >
        <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
          <Plus className="size-[18px]" aria-hidden="true" />
          Add
        </Link>
      </Button>
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

type ExpenseYearViewProps = {
  data: ExpenseYear;
  isCurrentYear: boolean;
  currentYear: number;
  onYearChange: (year: number) => void;
  vehicleId: string;
  /** Null when not known yet or no distance has been driven (shown as "—"). */
  costPerKm: Money | null;
};

function ExpenseYearView({
  data,
  isCurrentYear,
  currentYear,
  onYearChange,
  vehicleId,
  costPerKm,
}: ExpenseYearViewProps) {
  const currentMonth = new Date().getMonth();
  const items = journalItems(data);
  // Items are newest first, so months come out newest first too.
  const months = [...new Set(items.map((item) => monthIndexOf(item.entry.date)))];
  const monthTotal = (month: number) =>
    data.monthTotals[month] ?? { amount: '0.00', currency: data.yearTotal.currency };

  return (
    <>
      <div className={isCurrentYear ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}>
        <StatTile
          label={isCurrentYear ? 'This year' : `Total ${data.year}`}
          value={formatMoney(data.yearTotal)}
          info={metricInfo.yearTotal(data.year)}
        />
        {isCurrentYear && (
          <StatTile
            label="This month"
            value={formatMoney(monthTotal(currentMonth))}
            info={metricInfo.monthTotal}
          />
        )}
        <StatTile
          label="Per km"
          value={costPerKm ? formatMoneyCents(costPerKm) : '—'}
          caption="Incl. purchase price"
          info={metricInfo.lifetimeCostPerKm}
        />
      </div>
      <PeriodSwitcher
        year={data.year}
        firstYear={data.firstYear}
        lastYear={currentYear}
        onChange={onYearChange}
      />
      {items.length === 0 ? (
        <EmptyState
          title={`No journal entries in ${data.year}`}
          description="Log what this car costs, its odometer or anything you notice."
          action={
            <Button asChild className="mt-2">
              <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
                Add to journal
              </Link>
            </Button>
          }
        />
      ) : (
        months.map((month) => (
          <JournalMonthGroup
            key={month}
            month={month}
            total={monthTotal(month)}
            items={items.filter((item) => monthIndexOf(item.entry.date) === month)}
          />
        ))
      )}
    </>
  );
}
