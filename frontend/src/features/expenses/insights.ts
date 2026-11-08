import type { Money } from '@/shared/api/generated/model';

/**
 * The index of the highest total (a month 0–11, or a year in the all-time chart); the earliest wins a tie.
 * Null when there is no spending (specs/insights.md, AC 3).
 */
export function peakIndex(totals: readonly Money[]): number | null {
  let peak: number | null = null;
  let peakAmount = 0;
  for (const [index, total] of totals.entries()) {
    const amount = Number(total.amount);
    if (amount > peakAmount) {
      peak = index;
      peakAmount = amount;
    }
  }
  return peak;
}
