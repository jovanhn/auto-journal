import { Link } from '@tanstack/react-router';
import type { LogEntry } from '@/shared/api/generated/model';
import { formatKm } from '@/shared/lib/money';
import { journalDate } from '@/shared/lib/dates';
import type { JournalSearch } from '../journal';

type LogEntryRowProps = {
  entry: LogEntry;
  /** Dates of other years show the year. */
  currentYear: number;
  /** Journal filters kept for the way back. */
  search: JournalSearch;
};

/**
 * Log row in the journal (specs/journal.md, specs/journal-filters.md): a hollow ring instead of the category dot,
 * the note as the title ("Odometer reading" without one), "Oct 20 · 185,000 km", and no amount. Tapping it opens
 * Edit log.
 */
export function LogEntryRow({ entry, currentYear, search }: LogEntryRowProps) {
  return (
    <Link
      to="/vehicles/$vehicleId/log-entries/$logEntryId/edit"
      params={{ vehicleId: entry.vehicleId, logEntryId: entry.id }}
      search={search}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        className="size-2.5 shrink-0 rounded-full border-[1.5px] border-category-neutral"
        aria-hidden="true"
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">
          <span className="sr-only">Log: </span>
          {entry.note ?? 'Odometer reading'}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {journalDate(entry.date, currentYear)}
          {entry.odometer !== null && (
            <>
              {' · '}
              <span className="font-mono">{formatKm(entry.odometer)}</span>
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
