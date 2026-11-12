import { ChevronDown, Search } from 'lucide-react';
import { CATEGORIES, CATEGORY_LABELS } from '@/shared/lib/categories';
import { cn } from '@/shared/lib/utils';
import { isJournalType, type JournalPeriod, type JournalType } from '../journal';
import { YearChips } from './YearChips';

type JournalFilterBarProps = {
  query: string;
  type: JournalType | undefined;
  period: JournalPeriod;
  /** Newest first. */
  years: number[];
  onQueryChange: (query: string) => void;
  onTypeChange: (type: JournalType | undefined) => void;
  onPeriodChange: (period: JournalPeriod) => void;
};

const ALL = 'all';

/**
 * Search, entry type / category and year chips under the app bar (design: Vehicle · Journal; specs/journal-filters.md,
 * BR-J6). The type select is highlighted while it narrows the list.
 */
export function JournalFilterBar({
  query,
  type,
  period,
  years,
  onQueryChange,
  onTypeChange,
  onPeriodChange,
}: JournalFilterBarProps) {
  return (
    <div role="search" className="-mx-5 flex flex-col gap-2 border-b bg-background px-5 pb-3">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <label htmlFor="journal-search" className="sr-only">
            Search journal
          </label>
          <input
            id="journal-search"
            type="search"
            placeholder="Search"
            value={query}
            onChange={(event) => {
              onQueryChange(event.target.value);
            }}
            className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-[15px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
        <div className="relative w-37 shrink-0">
          <label htmlFor="journal-type" className="sr-only">
            Entry type
          </label>
          <select
            id="journal-type"
            value={type ?? ALL}
            onChange={(event) => {
              const value = event.target.value;
              onTypeChange(isJournalType(value) ? value : undefined);
            }}
            className={cn(
              'h-12 w-full cursor-pointer appearance-none rounded-xl border pr-8 pl-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              type
                ? 'border-primary bg-primary-subtle font-semibold text-primary'
                : 'border-input bg-card font-medium text-foreground',
            )}
          >
            <option value={ALL}>All entries</option>
            <optgroup label="Entry type">
              <option value="expense">Expenses</option>
              <option value="log">Log entries</option>
            </optgroup>
            <optgroup label="Expense category">
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </optgroup>
          </select>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2',
              type ? 'text-primary' : 'text-foreground',
            )}
            aria-hidden="true"
          />
        </div>
      </div>
      <YearChips years={years} selected={period} onChange={onPeriodChange} />
    </div>
  );
}
