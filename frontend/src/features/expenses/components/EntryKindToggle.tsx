import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import type { JournalEntryKind } from '../schemas';

type EntryKindToggleProps = {
  kind: JournalEntryKind;
  onChange: (kind: JournalEntryKind) => void;
};

const KINDS: { kind: JournalEntryKind; label: string }[] = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'log', label: 'Log' },
];

/** Expense | Log at the top of the journal form (specs/journal.md); toggle buttons like the period toggle. */
export function EntryKindToggle({ kind, onChange }: EntryKindToggleProps) {
  return (
    <div role="group" aria-label="Entry type" className="grid grid-cols-2 gap-2">
      {KINDS.map(({ kind: option, label }) => {
        const selected = option === kind;
        return (
          <Button
            key={option}
            type="button"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            className={cn('h-11', !selected && 'bg-card')}
            onClick={() => {
              if (!selected) onChange(option);
            }}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
