import { Link } from '@tanstack/react-router';
import type { Issue } from '@/shared/api/generated/model';
import { cn } from '@/shared/lib/utils';
import { openIssueLine } from '../issues';
import { SeverityPill } from './SeverityPill';

type IssueRowProps = {
  issue: Issue;
  currentYear: number;
};

/** Open issue row (design.md, "Issue row"): severity marker, title, source · date · odometer, severity pill. Opens Edit issue. */
export function IssueRow({ issue, currentYear }: IssueRowProps) {
  return (
    <Link
      to="/vehicles/$vehicleId/issues/$issueId/edit"
      params={{ vehicleId: issue.vehicleId, issueId: issue.id }}
      className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-2.5 shrink-0 rounded-full',
          issue.severity === 'URGENT' && 'bg-warning',
          issue.severity === 'FIX_SOON' && 'bg-foreground',
          issue.severity === 'WATCH' && 'border-2 border-muted-foreground',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{issue.title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {openIssueLine(issue, currentYear)}
        </span>
      </span>
      <SeverityPill severity={issue.severity} />
    </Link>
  );
}
