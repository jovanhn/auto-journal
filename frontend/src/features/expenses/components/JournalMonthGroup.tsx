import type { Money } from '@/shared/api/generated/model';
import { formatMoneyCents } from '@/shared/lib/money';
import type { JournalItem, JournalSearch } from '../journal';
import { ExpenseRow } from './ExpenseRow';
import { LogEntryRow } from './LogEntryRow';

type JournalMonthGroupProps = {
  /** "October", or "October 2025" when all years are shown. */
  label: string;
  /** Sum of the month's shown expenses; null when it shows none (no total, specs/journal.md edge cases). */
  total: Money | null;
  items: JournalItem[];
  /** Rows show dates of other years with the year. */
  currentYear: number;
  /** The journal filters, kept when opening an entry (specs/journal-filters.md AC8). */
  search: JournalSearch;
};

/** Month header with its total, then a card of the month's journal entries (design: `ExpenseMonthGroup`). */
export function JournalMonthGroup({ label, total, items, currentYear, search }: JournalMonthGroupProps) {
  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <h2 className="flex justify-between px-1 text-[13px] font-semibold text-muted-foreground">
        <span>{label}</span>
        {total && <span className="tabular-nums">{formatMoneyCents(total)}</span>}
      </h2>
      <ul
        className="divide-y divide-muted overflow-hidden rounded-2xl border bg-card"
        aria-label={`${label} journal`}
      >
        {items.map((item) => (
          <li key={item.entry.id}>
            {item.kind === 'expense' ? (
              <ExpenseRow expense={item.entry} currentYear={currentYear} search={search} />
            ) : (
              <LogEntryRow entry={item.entry} currentYear={currentYear} search={search} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
