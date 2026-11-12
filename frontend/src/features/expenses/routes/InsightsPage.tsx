import type { ReactNode } from 'react';
import { getRouteApi } from '@tanstack/react-router';
import type { CategoryTotal, VehicleAllTimeInsights, VehicleInsights } from '@/shared/api/generated/model';
import { formatKm, formatMoney, formatMoneyCents } from '@/shared/lib/money';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { CategoryBreakdown } from '../components/CategoryBreakdown';
import { MonthlyBarChart } from '../components/MonthlyBarChart';
import { PeriodSwitcher } from '../components/PeriodSwitcher';
import { PeriodToggle } from '../components/PeriodToggle';
import { StatTile } from '../components/StatTile';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { YearlyBarChart } from '../components/YearlyBarChart';
import { monthName } from '@/shared/lib/dates';
import { useVehicle } from '../hooks/useVehicle';
import { useVehicleAllTimeInsights, useVehicleInsights } from '../hooks/useVehicleInsights';
import { peakIndex } from '../insights';
import { metricInfo } from '../metricInfo';

const route = getRouteApi('/_app/vehicles/$vehicleId/insights');

/**
 * Vehicle · Insights (design screen 03, specs/insights.md). **Year:** the year's total, average, distance and
 * cost per km, the by-month chart and the by-category breakdown. **All time:** total, average, car value,
 * lifetime distance and cost per km, the by-year chart and the all-time breakdown.
 */
export function InsightsPage() {
  const { vehicleId } = route.useParams();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const currentYear = new Date().getFullYear();
  const allTime = search.period === 'all';
  const year = Math.min(search.year ?? currentYear, currentYear);
  const vehicle = useVehicle(vehicleId);
  const yearInsights = useVehicleInsights(vehicleId, year, !allTime);
  const allTimeInsights = useVehicleAllTimeInsights(vehicleId, allTime);
  const insights = allTime ? allTimeInsights : yearInsights;

  const changeYear = (next: number) =>
    void navigate({ search: next === currentYear ? {} : { year: next }, replace: true });
  const changePeriod = (all: boolean) =>
    void navigate({ search: all ? { period: 'all' } : {}, replace: true });

  return (
    <div className="flex flex-col gap-4 pb-24">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle={`Insights · ${allTime ? 'All time' : year}`}
      />
      <PeriodToggle allTime={allTime} onChange={changePeriod} />
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
      ) : allTimeInsights.data && allTime ? (
        <AllTimeView data={allTimeInsights.data} />
      ) : yearInsights.data ? (
        <YearView data={yearInsights.data} currentYear={currentYear} onYearChange={changeYear} />
      ) : null}
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

type YearViewProps = {
  data: VehicleInsights;
  currentYear: number;
  onYearChange: (year: number) => void;
};

function YearView({ data, currentYear, onYearChange }: YearViewProps) {
  const peak = peakIndex(data.monthTotals);
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
        <StatTile
          label="Total spent"
          value={formatMoney(data.total)}
          variant="inverse"
          size="large"
          info={metricInfo.yearTotal(data.year)}
        />
        <StatTile
          label="Avg per month"
          value={formatMoney(data.averagePerMonth)}
          size="large"
          info={metricInfo.yearAverage(data.year)}
        />
        <StatTile
          label="Distance"
          value={data.yearDistanceKm === null ? '—' : formatKm(data.yearDistanceKm)}
          caption={`In ${data.year}`}
          size="large"
          info={metricInfo.yearDistance(data.year)}
        />
        <StatTile
          label="Per km"
          value={data.yearCostPerKm ? formatMoneyCents(data.yearCostPerKm) : '—'}
          caption={`In ${data.year}`}
          size="large"
          info={metricInfo.yearCostPerKm(data.year)}
        />
      </div>

      <ChartSection
        title="By month"
        peakCaption={
          peak !== null && peakTotal ? `${monthName(peak).slice(0, 3)} · ${formatMoney(peakTotal)}` : null
        }
      >
        <MonthlyBarChart
          year={data.year}
          monthTotals={data.monthTotals}
          highlightedMonth={highlighted}
          peakMonth={peak}
        />
      </ChartSection>

      <CategorySection categories={data.categories} emptyTitle={`No expenses in ${data.year}`} />
    </>
  );
}

function AllTimeView({ data }: { data: VehicleAllTimeInsights }) {
  const peak = peakIndex(data.yearTotals.map(({ total }) => total));
  const peakYear = peak === null ? undefined : data.yearTotals[peak];

  return (
    <>
      <StatTile
        label="Total spent"
        value={formatMoney(data.total)}
        variant="inverse"
        size="large"
        info={metricInfo.allTimeTotal}
      />
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Avg per month"
          value={formatMoney(data.averagePerMonth)}
          size="large"
          info={metricInfo.allTimeAverage}
        />
        <StatTile
          label="Car value"
          value={formatMoney(data.carValue)}
          caption="Purchase price"
          size="large"
          info={metricInfo.carValue}
        />
        <StatTile
          label="Distance"
          value={formatKm(data.distanceKm)}
          size="large"
          info={metricInfo.allTimeDistance}
        />
        <StatTile
          label="Per km"
          value={data.costPerKm ? formatMoneyCents(data.costPerKm) : '—'}
          caption="Incl. purchase price"
          size="large"
          info={metricInfo.lifetimeCostPerKm}
        />
      </div>

      <ChartSection
        title="By year"
        peakCaption={peakYear ? `${peakYear.year} · ${formatMoney(peakYear.total)}` : null}
      >
        <YearlyBarChart yearTotals={data.yearTotals} peakIndex={peak} />
      </ChartSection>

      <CategorySection categories={data.categories} emptyTitle="No expenses yet" />
    </>
  );
}

type ChartSectionProps = {
  title: string;
  /** "<period> · <amount>" of the highest bar, or null without spending. */
  peakCaption: string | null;
  children: ReactNode;
};

function ChartSection({ title, peakCaption, children }: ChartSectionProps) {
  const id = `chart-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 id={id} className="text-[15px] font-semibold">
          {title}
        </h2>
        {peakCaption && (
          <span className="text-xs text-muted-foreground tabular-nums">Peak: {peakCaption}</span>
        )}
      </div>
      {children}
    </section>
  );
}

type CategorySectionProps = {
  categories: readonly CategoryTotal[];
  emptyTitle: string;
};

function CategorySection({ categories, emptyTitle }: CategorySectionProps) {
  return (
    <section aria-labelledby="by-category" className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <h2 id="by-category" className="text-[15px] font-semibold">
        By category
      </h2>
      {categories.length === 0 ? (
        <EmptyState title={emptyTitle} description="Spending by category shows up here." />
      ) : (
        <CategoryBreakdown categories={categories} />
      )}
    </section>
  );
}
