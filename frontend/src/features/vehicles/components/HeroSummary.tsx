import type { ExpenseSummary } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';
import { MetricInfo } from '@/shared/ui/MetricInfo';

type HeroSummaryProps = {
  summary: ExpenseSummary;
  vehicleCount: number;
};

/** All-cars hero on the Garage (design: `HeroSummary`): this year's total, vehicle count, average per month. */
export function HeroSummary({ summary, vehicleCount }: HeroSummaryProps) {
  return (
    <section
      aria-label="All cars this year"
      className="flex flex-col gap-1 rounded-2xl bg-inverse p-5 text-inverse-foreground"
    >
      <span className="flex items-center justify-between gap-1 text-sm text-inverse-muted">
        All cars · {summary.year} so far
        <MetricInfo
          label="All cars this year"
          text="Sum of all expenses of all your vehicles this year; average = that ÷ months elapsed this year."
          inverse
        />
      </span>
      <span className="text-4xl font-semibold tabular-nums">{formatMoney(summary.total)}</span>
      <span className="text-sm text-inverse-muted tabular-nums">
        {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'} · avg{' '}
        {formatMoney(summary.averagePerMonth)} / month
      </span>
    </section>
  );
}
