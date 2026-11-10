import { Link } from '@tanstack/react-router';
import { NotebookPen } from 'lucide-react';
import type { LogEntry } from '@/shared/api/generated/model';
import { formatKm } from '@/shared/lib/money';
import { shortDate } from '@/shared/lib/dates';

type LogEntryRowProps = {
  entry: LogEntry;
};

/**
 * Log row in the journal (specs/journal.md, UI notes): a neutral icon instead of the category dot, the note as the
 * title ("Odometer reading" without one), "Oct 20 · 185,000 km", and no amount. Tapping it opens Edit log.
 */
export function LogEntryRow({ entry }: LogEntryRowProps) {
  return (
    <Link
      to="/vehicles/$vehicleId/log-entries/$logEntryId/edit"
      params={{ vehicleId: entry.vehicleId, logEntryId: entry.id }}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <NotebookPen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-medium">
          <span className="sr-only">Log: </span>
          {entry.note ?? 'Odometer reading'}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {shortDate(entry.date)}
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
