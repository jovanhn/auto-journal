import { Link } from '@tanstack/react-router';
import type { Expense } from '@/shared/api/generated/model';
import { formatKm, formatMoneyCents, formatMoneyExact } from '@/shared/lib/money';
import { cn } from '@/shared/lib/utils';
import { CATEGORY_DOT_CLASSES, CATEGORY_LABELS } from '@/shared/lib/categories';
import { journalDate } from '@/shared/lib/dates';
import type { JournalSearch } from '../journal';

type ExpenseRowProps = {
  expense: Expense;
  /** Dates of other years show the year. */
  currentYear: number;
  /** Journal filters kept for the way back. */
  search: JournalSearch;
};

/**
 * Expense row (design: `ExpenseRow`): category dot, "Category · note", "Oct 18 · 184,320 km", the display
 * amount (with `≈` when approximate, BR-E6), and the original amount when its currency differs. Tapping it opens
 * Edit expense.
 */
export function ExpenseRow({ expense, currentYear, search }: ExpenseRowProps) {
  const title = [CATEGORY_LABELS[expense.category], expense.note].filter(Boolean).join(' · ');
  const converted = expense.amount.currency !== expense.displayAmount.currency;
  return (
    <Link
      to="/vehicles/$vehicleId/expenses/$expenseId/edit"
      params={{ vehicleId: expense.vehicleId, expenseId: expense.id }}
      search={search}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_DOT_CLASSES[expense.category])}
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {journalDate(expense.date, currentYear)}
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
          {expense.approximate && (
            <>
              <span aria-hidden="true">≈ </span>
              <span className="sr-only">approximately </span>
            </>
          )}
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
