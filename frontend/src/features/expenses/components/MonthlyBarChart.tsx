import type { Money } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { monthName } from '@/shared/lib/dates';

type MonthlyBarChartProps = {
  year: number;
  /** January … December. */
  monthTotals: readonly Money[];
  /** The highlighted bar (0–11): the current month, or the peak month of a past year. */
  highlightedMonth: number | null;
  peakMonth: number | null;
};

/** Bar heights are in viewBox units; the tallest bar fills the chart. */
const HEIGHT = 100;
const BAR_WIDTH = 6;
const GAP = 4;

/**
 * By-month chart (design: `MonthlyBarChart`), 12 bars Jan…Dec drawn as plain SVG (no chart library), with an
 * `aria-label` summary for screen readers.
 */
export function MonthlyBarChart({ year, monthTotals, highlightedMonth, peakMonth }: MonthlyBarChartProps) {
  const amounts = monthTotals.map((total) => Number(total.amount));
  const max = Math.max(...amounts, 0);
  const peak = peakMonth === null ? undefined : monthTotals[peakMonth];
  const summary =
    peak && peakMonth !== null
      ? `Monthly spending January to December ${year}, peak in ${monthName(peakMonth)} at ${formatMoney(peak)}`
      : `No spending in ${year}`;

  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${12 * (BAR_WIDTH + GAP) - GAP} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full border-b"
      >
        {amounts.map((amount, month) => {
          const height = max > 0 ? Math.max((amount / max) * HEIGHT, amount > 0 ? 2 : 0) : 0;
          return (
            <rect
              key={month}
              x={month * (BAR_WIDTH + GAP)}
              y={HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
              rx={1}
              className={cn(month === highlightedMonth ? 'fill-primary' : 'fill-chart-muted')}
            />
          );
        })}
      </svg>
      <div aria-hidden="true" className="grid grid-cols-12 font-mono text-[11px] text-muted-foreground">
        {amounts.map((_, month) => (
          <span key={month} className={cn('text-center', month === highlightedMonth && 'text-foreground')}>
            {monthName(month).charAt(0)}
          </span>
        ))}
      </div>
    </div>
  );
}
