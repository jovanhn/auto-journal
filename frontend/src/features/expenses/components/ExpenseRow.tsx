import { Link } from '@tanstack/react-router';
import type { Expense } from '@/shared/api/generated/model';
import { formatKm, formatMoneyCents, formatMoneyExact } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { CATEGORY_DOT_CLASSES, CATEGORY_LABELS } from '../categories';
import { shortDate } from '../dates';

type ExpenseRowProps = {
  expense: Expense;
};

/**
 * Expense row (design: `ExpenseRow`): category dot, "Category · note", "Oct 18 · 184,320 km", the display
 * amount, and the original amount when its currency differs. Tapping it opens Edit expense.
 */
export function ExpenseRow({ expense }: ExpenseRowProps) {
  const title = [CATEGORY_LABELS[expense.category], expense.note].filter(Boolean).join(' · ');
  const converted = expense.amount.currency !== expense.displayAmount.currency;
  return (
    <Link
      to="/vehicles/$vehicleId/expenses/$expenseId/edit"
      params={{ vehicleId: expense.vehicleId, expenseId: expense.id }}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[expense.category])}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {shortDate(expense.date)}
          {expense.odometer !== null && (
            <>
              {' · '}
              <span className="font-mono">{formatKm(expense.odometer)}</span>
            </>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[15px] font-semibold tabular-nums">
          {formatMoneyCents(expense.displayAmount)}
        </span>
        {converted && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatMoneyExact(expense.amount)}
          </span>
        )}
      </span>
    </Link>
  );
}
