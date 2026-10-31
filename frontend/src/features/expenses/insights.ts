import type { Money } from '@/shared/api/generated/model';

/**
 * The month (0–11) with the highest total; the earliest month wins a tie. Null when the year has no spending
 * (specs/insights.md, AC 3).
 */
export function peakMonth(monthTotals: readonly Money[]): number | null {
  let peak: number | null = null;
  let peakAmount = 0;
  for (const [month, total] of monthTotals.entries()) {
    const amount = Number(total.amount);
    if (amount > peakAmount) {
      peak = month;
      peakAmount = amount;
    }
  }
  return peak;
}
