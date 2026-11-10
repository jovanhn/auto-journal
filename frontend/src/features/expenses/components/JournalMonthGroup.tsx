import type { Money } from '@/shared/api/generated/model';
import { formatMoneyCents } from '@/shared/lib/money';
import { monthName } from '@/shared/lib/dates';
import type { JournalItem } from '../journal';
import { ExpenseRow } from './ExpenseRow';
import { LogEntryRow } from './LogEntryRow';

type JournalMonthGroupProps = {
  /** 0–11. */
  month: number;
  total: Money;
  items: JournalItem[];
};

/**
 * Month header with its total, then a card of the month's journal entries (design: `ExpenseMonthGroup`). A month
 * with only log entries shows no total (specs/journal.md edge cases).
 */
export function JournalMonthGroup({ month, total, items }: JournalMonthGroupProps) {
  const name = monthName(month);
  const hasExpenses = items.some((item) => item.kind === 'expense');
  return (
    <section aria-label={name} className="flex flex-col gap-2">
      <h2 className="flex justify-between px-1 text-sm font-semibold">
        <span>{name}</span>
        {hasExpenses && <span className="tabular-nums">{formatMoneyCents(total)}</span>}
      </h2>
      <ul
        className="divide-y divide-muted overflow-hidden rounded-2xl border bg-card"
        aria-label={`${name} journal`}
      >
        {items.map((item) => (
          <li key={item.entry.id}>
            {item.kind === 'expense' ? (
              <ExpenseRow expense={item.entry} />
            ) : (
              <LogEntryRow entry={item.entry} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
