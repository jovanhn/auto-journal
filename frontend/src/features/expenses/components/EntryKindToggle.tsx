import { cn } from '@/shared/lib/utils';
import type { JournalEntryKind } from '../schemas';

type EntryKindToggleProps = {
  kind: JournalEntryKind;
  onChange: (kind: JournalEntryKind) => void;
};

/**
 * "This is an expense" switch row of the journal form (design: Add journal entry; specs/journal-filters.md): on =
 * Expense, off = Log.
 */
export function EntryKindToggle({ kind, onChange }: EntryKindToggleProps) {
  const isExpense = kind === 'expense';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isExpense}
      aria-labelledby="entry-kind-label"
      aria-describedby="entry-kind-hint"
      onClick={() => {
        onChange(isExpense ? 'log' : 'expense');
      }}
      className="flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex flex-col gap-0.5">
        <span id="entry-kind-label" className="text-[15px] font-semibold">
          This is an expense
        </span>
        <span id="entry-kind-hint" className="text-[13px] text-muted-foreground">
          Adds amount, currency and category
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-7 w-12 shrink-0 rounded-full p-[3px] transition-colors',
          isExpense ? 'justify-end bg-primary' : 'justify-start bg-input',
        )}
      >
        <span className="size-[22px] rounded-full bg-card shadow-sm" />
      </span>
    </button>
  );
}
