import type { Category, Currency, Expense, LogEntry, Money } from '@/shared/api/generated/model';
import { CATEGORIES, CATEGORY_LABELS } from '@/shared/lib/categories';

/** One row of the journal: an expense or a log entry (specs/journal.md). */
export type JournalItem = { kind: 'expense'; entry: Expense } | { kind: 'log'; entry: LogEntry };

/** `expense`, `log` or one expense category (BR-J6). */
export type JournalType = 'expense' | 'log' | Category;

/** Journal filters in the URL (specs/journal-filters.md); absent = the default. */
export type JournalSearch = {
  /** A year or `all`; the current year when absent. */
  year?: number | 'all';
  /** All entries when absent. */
  type?: JournalType;
  /** Search text; no search when absent. */
  q?: string;
};

/** The period shown: one year or all years. */
export type JournalPeriod = number | 'all';

export const isJournalType = (value: unknown): value is JournalType =>
  value === 'expense' || value === 'log' || (CATEGORIES as readonly unknown[]).includes(value);

/** BR-J1: expenses and log entries together, newest date first; for the same date, newest created first. */
export function journalItems(source: { expenses: Expense[]; logEntries: LogEntry[] }): JournalItem[] {
  const items: JournalItem[] = [
    ...source.expenses.map((entry): JournalItem => ({ kind: 'expense', entry })),
    ...source.logEntries.map((entry): JournalItem => ({ kind: 'log', entry })),
  ];
  return items.sort(
    (a, b) =>
      b.entry.date.localeCompare(a.entry.date) ||
      Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt),
  );
}

/** The row title: "Category · note" for an expense; the note, or "Odometer reading", for a log entry. */
export function itemTitle(item: JournalItem): string {
  if (item.kind === 'log') return item.entry.note ?? 'Odometer reading';
  return [CATEGORY_LABELS[item.entry.category], item.entry.note].filter(Boolean).join(' · ');
}

const yearOf = (isoDate: string): number => Number(isoDate.slice(0, 4));

/** BR-J6: the items in [period] that match the type and the search (case-insensitive, in the title). */
export function filterJournal(
  items: JournalItem[],
  period: JournalPeriod,
  type: JournalType | undefined,
  query: string | undefined,
): JournalItem[] {
  const needle = (query ?? '').trim().toLowerCase();
  return items.filter((item) => {
    if (period !== 'all' && yearOf(item.entry.date) !== period) return false;
    if (type === 'log' && item.kind !== 'log') return false;
    if (type === 'expense' && item.kind !== 'expense') return false;
    if (type && type !== 'log' && type !== 'expense') {
      if (item.kind !== 'expense' || item.entry.category !== type) return false;
    }
    return needle === '' || itemTitle(item).toLowerCase().includes(needle);
  });
}

const toCents = (amount: string): number => Math.round(Number(amount) * 100);
const fromCents = (cents: number, currency: Currency): Money => ({
  amount: (cents / 100).toFixed(2),
  currency,
});

/** Sum of the expenses' display amounts (BR-J7); log entries never count (BR-J3). */
export function sumExpenses(items: JournalItem[], currency: Currency): Money {
  const cents = items.reduce(
    (sum, item) => (item.kind === 'expense' ? sum + toCents(item.entry.displayAmount.amount) : sum),
    0,
  );
  return fromCents(cents, currency);
}

/**
 * Months the average divides by (BR-J7): one year as BR-I3 (12 for a past year, January to now for this year);
 * all years as BR-I9 (from the month of the earlier of the purchase date and the first expense to now). At least 1.
 */
export function averageMonths(period: JournalPeriod, today: Date, earliestDate: string | undefined): number {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (period !== 'all') return period < year ? 12 : month + 1;
  if (!earliestDate) return 1;
  const months = (year - yearOf(earliestDate)) * 12 + (month - (Number(earliestDate.slice(5, 7)) - 1)) + 1;
  return Math.max(1, months);
}

/** Spent ÷ months, rounded to cents (BR-J7). */
export function averagePerMonth(spent: Money, months: number): Money {
  return fromCents(Math.round(toCents(spent.amount) / months), spent.currency);
}

/** The earlier of two ISO dates, ignoring missing ones. */
export function earlierDate(...dates: (string | undefined)[]): string | undefined {
  return dates.filter((date): date is string => !!date).sort()[0];
}
