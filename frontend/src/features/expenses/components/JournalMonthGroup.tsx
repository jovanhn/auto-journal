import type { Expense, Money } from '@/shared/api/generated/model';
import { formatMoneyCents } from '@/shared/lib/money';
import { monthName } from '@/shared/lib/dates';
import { ExpenseRow } from './ExpenseRow';

type ExpenseMonthGroupProps = {
  /** 0–11. */
  month: number;
  total: Money;
  expenses: Expense[];
};

/** Month header with its total, then a card of the month's expenses (design: `ExpenseMonthGroup`). */
export function ExpenseMonthGroup({ month, total, expenses }: ExpenseMonthGroupProps) {
  const name = monthName(month);
  return (
    <section aria-label={name} className="flex flex-col gap-2">
      <h2 className="flex justify-between px-1 text-sm font-semibold">
        <span>{name}</span>
        <span className="tabular-nums">{formatMoneyCents(total)}</span>
      </h2>
      <ul
        className="divide-y divide-muted overflow-hidden rounded-2xl border bg-card"
        aria-label={`${name} expenses`}
      >
        {expenses.map((expense) => (
          <li key={expense.id}>
            <ExpenseRow expense={expense} />
          </li>
        ))}
      </ul>
    </section>
  );
}
