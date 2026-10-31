import { getRouteApi } from '@tanstack/react-router';
import type { VehicleInsights } from '@/shared/api/generated/model';
import { formatKm, formatMoney } from '@/shared/lib/money';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { StatTile } from '../components/StatTile';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { monthName } from '@/shared/lib/dates';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleInsights } from '../hooks/useVehicleInsights';
import { peakMonth } from '../insights';

const route = getRouteApi('/_app/vehicles/$vehicleId/insights');

/**
 * Vehicle · Insights (design screen 03): the year's total and average, the car's value and distance, the
 * by-month chart and the by-category breakdown (specs/insights.md).
 */
export function InsightsPage() {
  const { vehicleId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const currentYear = new Date().getFullYear();
  const year = Math.min(search.year ?? currentYear, currentYear);
  const vehicle = useVehicle(vehicleId);
  const insights = useVehicleInsights(vehicleId, year);

  const changeYear = (next: number) =>
    void navigate({ search: next === currentYear ? {} : { year: next }, replace: true });

  return (
    <div className="flex flex-col gap-4 pb-24">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle={`Insights · ${year}`}
      />
      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : insights.isPending ? (
        <LoadingState label="Loading insights…" rows={6} />
      ) : insights.isError ? (
        <ErrorState
          title="Could not load the insights"
          error={insights.error}
          onRetry={() => void insights.refetch()}
        />
      ) : (
        <InsightsView data={insights.data} currentYear={currentYear} onYearChange={changeYear} />
      )}
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

type InsightsViewProps = {
  data: VehicleInsights;
  currentYear: number;
  onYearChange: (year: number) => void;
};

function InsightsView({ data, currentYear, onYearChange }: InsightsViewProps) {
  const peak = peakMonth(data.monthTotals);
  const peakTotal = peak === null ? undefined : data.monthTotals[peak];
  // AC 3–4: the current month in the current year, the peak month in a past year.
  const highlighted = data.year === currentYear ? new Date().getMonth() : peak;

  return (
    <>
      <PeriodSwitcher
        year={data.year}
        firstYear={data.firstYear}
        lastYear={currentYear}
        onChange={onYearChange}
      />
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Total spent" value={formatMoney(data.total)} variant="inverse" size="large" />
        <StatTile label="Avg per month" value={formatMoney(data.averagePerMonth)} size="large" />
        <StatTile
          label="Car value"
          value={formatMoney(data.carValue)}
          caption="Purchase price"
          size="large"
        />
        <StatTile label="Distance" value={formatKm(data.distanceKm)} size="large" />
      </div>

      <section aria-labelledby="by-month" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 id="by-month" className="text-[15px] font-semibold">
            By month
          </h2>
          {peak !== null && peakTotal && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Peak: {monthName(peak).slice(0, 3)} · {formatMoney(peakTotal)}
            </span>
          )}
        </div>
        <MonthlyBarChart
          year={data.year}
          monthTotals={data.monthTotals}
          highlightedMonth={highlighted}
          peakMonth={peak}
        />
      </section>

      <section aria-labelledby="by-category" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
        <h2 id="by-category" className="text-[15px] font-semibold">
          By category
        </h2>
        {data.categories.length === 0 ? (
          <EmptyState
            title={`No expenses in ${data.year}`}
            description="Spending by category shows up here."
          />
        ) : (
          <CategoryBreakdown categories={data.categories} />
        )}
      </section>
    </>
  );
}
