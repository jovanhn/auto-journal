import type { Money } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';
import { monthName } from '@/shared/lib/dates';
import { BarChart } from './BarChart';

type MonthlyBarChartProps = {
  year: number;
  /** January … December. */
  monthTotals: readonly Money[];
  /** The highlighted bar (0–11): the current month, or the peak month of a past year. */
  highlightedMonth: number | null;
  peakMonth: number | null;
};

/** By-month chart (design: `MonthlyBarChart`): 12 bars Jan…Dec with month initials. */
export function MonthlyBarChart({ year, monthTotals, highlightedMonth, peakMonth }: MonthlyBarChartProps) {
  const peak = peakMonth === null ? undefined : monthTotals[peakMonth];
  const summary =
    peak && peakMonth !== null
      ? `Monthly spending January to December ${year}, peak in ${monthName(peakMonth)} at ${formatMoney(peak)}`
      : `No spending in ${year}`;
  return (
    <BarChart
      amounts={monthTotals.map((total) => Number(total.amount))}
      labels={monthTotals.map((_, month) => monthName(month).charAt(0))}
      highlighted={highlightedMonth}
      summary={summary}
    />
  );
}
