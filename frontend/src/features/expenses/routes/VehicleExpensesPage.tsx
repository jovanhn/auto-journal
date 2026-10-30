import { getRouteApi, Link } from '@tanstack/react-router';
import { ChevronLeft, Pencil, Plus } from 'lucide-react';
import type { ExpenseYear } from '@/shared/api/generated/model';
import { formatKm, formatMoney } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Skeleton } from '@/shared/ui/skeleton';
import { ExpenseMonthGroup } from '../components/ExpenseMonthGroup';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { StatTile } from '../components/StatTile';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { monthIndexOf } from '../dates';
import { useExpenseYear } from '../hooks/useExpenseYear';
import { useVehicle } from '../hooks/useVehicle';

const route = getRouteApi('/_app/vehicles/$vehicleId');

/**
 * Vehicle · Expenses (design screen 02): app bar with Edit vehicle, This year / This month tiles, the year
 * switcher, the year's expenses grouped by month (newest first), and the Add expense FAB.
 */
export function VehicleExpensesPage() {
  const { vehicleId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const currentYear = new Date().getFullYear();
  const year = Math.min(search.year ?? currentYear, currentYear);
  const vehicle = useVehicle(vehicleId);
  const expenses = useExpenseYear(vehicleId, year);

  const changeYear = (next: number) =>
    void navigate({ search: next === currentYear ? {} : { year: next }, replace: true });

  return (
    <div className="flex flex-col gap-4 pb-36">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="-ml-3 size-11" asChild>
          <Link to="/" aria-label="Back to garage">
            <ChevronLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 flex-col">
          {vehicle.isPending ? (
            <Skeleton className="h-6 w-40" />
          ) : vehicle.isError ? (
            <h1 className="text-xl font-semibold">Vehicle</h1>
          ) : (
            <>
              <h1 className="truncate text-xl font-semibold">{vehicle.data.nickname}</h1>
              <p className="truncate text-sm text-muted-foreground tabular-nums">
                {vehicle.data.make} {vehicle.data.model} · {vehicle.data.year} ·{' '}
                {formatKm(vehicle.data.currentOdometer)}
              </p>
            </>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-11" asChild>
          <Link to="/vehicles/$vehicleId/edit" params={{ vehicleId }} aria-label="Edit vehicle">
            <Pencil aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : expenses.isPending ? (
        <LoadingState label="Loading expenses…" rows={5} />
      ) : expenses.isError ? (
        <ErrorState
          title="Could not load the expenses"
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
        />
      )}

      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-24 z-10 h-13 rounded-full px-5 shadow-[0_4px_14px_rgb(22_24_29/0.18)]"
      >
        <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
          <Plus className="size-[18px]" aria-hidden="true" />
          Add expense
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
};

function ExpenseYearView({
  data,
  isCurrentYear,
  currentYear,
  onYearChange,
  vehicleId,
}: ExpenseYearViewProps) {
  const currentMonth = new Date().getMonth();
  // Expenses arrive newest first, so months come out newest first too.
  const months = [...new Set(data.expenses.map((expense) => monthIndexOf(expense.date)))];
  const monthTotal = (month: number) =>
    data.monthTotals[month] ?? { amount: '0.00', currency: data.yearTotal.currency };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label={isCurrentYear ? 'This year' : `Total ${data.year}`}
          value={formatMoney(data.yearTotal)}
        />
        {isCurrentYear && <StatTile label="This month" value={formatMoney(monthTotal(currentMonth))} />}
      </div>
      <PeriodSwitcher
        year={data.year}
        firstYear={data.firstYear}
        lastYear={currentYear}
        onChange={onYearChange}
      />
      {data.expenses.length === 0 ? (
        <EmptyState
          title={`No expenses in ${data.year}`}
          description="Log what this car costs to see your totals."
          action={
            <Button asChild className="mt-2">
              <Link to="/vehicles/$vehicleId/expenses/new" params={{ vehicleId }}>
                Add an expense
              </Link>
            </Button>
          }
        />
      ) : (
        months.map((month) => (
          <ExpenseMonthGroup
            key={month}
            month={month}
            total={monthTotal(month)}
            expenses={data.expenses.filter((expense) => monthIndexOf(expense.date) === month)}
          />
        ))
      )}
    </>
  );
}
