import type { Expense, ExpenseYear, LogEntry } from '@/shared/api/generated/model';

/** One row of the journal: an expense or a log entry (specs/journal.md). */
export type JournalItem = { kind: 'expense'; entry: Expense } | { kind: 'log'; entry: LogEntry };

/** BR-J1: expenses and log entries together, newest date first; for the same date, newest created first. */
export function journalItems(year: ExpenseYear): JournalItem[] {
  const items: JournalItem[] = [
    ...year.expenses.map((entry): JournalItem => ({ kind: 'expense', entry })),
    ...year.logEntries.map((entry): JournalItem => ({ kind: 'log', entry })),
  ];
  return items.sort(
    (a, b) =>
      b.entry.date.localeCompare(a.entry.date) ||
      Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt),
  );
}
