import { Link } from '@tanstack/react-router';
import type { PlannedExpense } from '@/shared/api/generated/model';
import { mediumDate } from '@/shared/lib/dates';
import { formatMoney } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { planStatus, planTitle, recurrenceLabel } from '../planning';
import { StatusPill } from './StatusPill';

type PlannedExpenseCardProps = {
  plan: PlannedExpense;
  /** ISO date of today, for the status pill. */
  today: string;
};

/**
 * Upcoming plan (design: `PlannedExpenseCard`): title, date · recurrence, display amount, status pill and Mark
 * as paid (accent outline when due soon). Tapping the title edits the plan.
 */
export function PlannedExpenseCard({ plan, today }: PlannedExpenseCardProps) {
  const title = planTitle(plan);
  return (
    <article aria-label={title} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
      <Link
        to="/vehicles/$vehicleId/planned/$plannedExpenseId/edit"
        params={{ vehicleId: plan.vehicleId, plannedExpenseId: plan.id }}
        aria-label={`Edit ${title}`}
        className="flex justify-between gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-base font-semibold">{title}</span>
          <span className="text-sm text-muted-foreground">
            {mediumDate(plan.dueDate)} · {recurrenceLabel(plan.recurrenceMonths)}
          </span>
        </span>
        <span className="shrink-0 text-base font-semibold tabular-nums">
          {formatMoney(plan.displayAmount)}
        </span>
      </Link>
      <div className="flex items-center justify-between">
        <StatusPill status={planStatus(plan, today)} />
        <Button
          variant="outline"
          asChild
          className={cn(
            'h-11 rounded-[10px] border-[1.5px] bg-card px-4 font-semibold',
            plan.dueSoon ? 'border-primary text-primary' : 'border-input',
          )}
        >
          <Link
            to="/vehicles/$vehicleId/planned/$plannedExpenseId/pay"
            params={{ vehicleId: plan.vehicleId, plannedExpenseId: plan.id }}
            aria-label={`Mark ${title} as paid`}
          >
            Mark as paid
          </Link>
        </Button>
      </div>
    </article>
  );
}
