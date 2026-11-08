import type { YearTotal } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';
import { BarChart } from './BarChart';

type YearlyBarChartProps = {
  /** Oldest year first. */
  yearTotals: readonly YearTotal[];
  /** Index into [yearTotals] of the highest year, or null without spending. */
  peakIndex: number | null;
};

/** More bars than this get two-digit year labels ('25) so they fit at 390 px. */
const FULL_LABELS_UP_TO = 6;

/** By-year chart (All time): one bar per year, the current (last) year highlighted. */
export function YearlyBarChart({ yearTotals, peakIndex }: YearlyBarChartProps) {
  const first = yearTotals[0]?.year;
  const last = yearTotals.at(-1)?.year;
  const peak = peakIndex === null ? undefined : yearTotals[peakIndex];
  const range = first === last ? `in ${first}` : `${first} to ${last}`;
  const summary = peak
    ? `Yearly spending ${range}, peak in ${peak.year} at ${formatMoney(peak.total)}`
    : `No spending ${range}`;
  const short = yearTotals.length > FULL_LABELS_UP_TO;
  return (
    <BarChart
      amounts={yearTotals.map(({ total }) => Number(total.amount))}
      labels={yearTotals.map(({ year }) => (short ? `'${String(year).slice(-2)}` : String(year)))}
      highlighted={yearTotals.length - 1}
      summary={summary}
    />
  );
}
