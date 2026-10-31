import type { PlannedExpense } from '@/shared/api/generated/model';
import { CATEGORY_LABELS } from '@/shared/lib/categories';
import { daysBetween, monthsBetween } from '@/shared/lib/dates';

/** Recurrence choices of the plan form (specs/planned-expenses.md, UI notes); '' = one-time. */
export const RECURRENCE_OPTIONS: readonly { value: string; label: string }[] = [
  { value: '', label: 'One-time' },
  { value: '1', label: 'Every month' },
  { value: '3', label: 'Every 3 months' },
  { value: '6', label: 'Every 6 months' },
  { value: '12', label: 'Every year' },
  { value: '24', label: 'Every 2 years' },
];

/** `one-time`, `every month`, `every 6 months`, `repeats yearly`, `every 2 years`, `every 5 months`. */
export function recurrenceLabel(months: number | null): string {
  if (months === null) return 'one-time';
  if (months === 1) return 'every month';
  if (months === 12) return 'repeats yearly';
  if (months === 24) return 'every 2 years';
  return `every ${months} months`;
}

/** `Insurance · renewal`, or just the category without a note. */
export function planTitle(plan: Pick<PlannedExpense, 'category' | 'note'>): string {
  const category = CATEGORY_LABELS[plan.category];
  return plan.note ? `${category} · ${plan.note}` : category;
}

export type PlanStatus = { tone: 'warning' | 'neutral'; label: string };

/**
 * The status pill (design: `StatusPill`): warning when due soon (BR-PL6, decided by the server) — "Overdue"
 * or "Due in N days" — neutral otherwise: "In N months".
 */
export function planStatus(plan: Pick<PlannedExpense, 'dueDate' | 'dueSoon'>, today: string): PlanStatus {
  const days = daysBetween(today, plan.dueDate);
  if (plan.dueSoon) {
    if (days < 0) return { tone: 'warning', label: 'Overdue' };
    if (days === 0) return { tone: 'warning', label: 'Due today' };
    return { tone: 'warning', label: days === 1 ? 'Due in 1 day' : `Due in ${days} days` };
  }
  const months = Math.max(1, monthsBetween(today, plan.dueDate));
  return { tone: 'neutral', label: months === 1 ? 'In 1 month' : `In ${months} months` };
}
