import { Link } from '@tanstack/react-router';
import { Check, CircleMinus } from 'lucide-react';
import type { Issue } from '@/shared/api/generated/model';
import { resolvedIssueLine } from '../issues';

type ResolvedIssueRowProps = {
  issue: Issue;
};

/** Resolved issue row (design.md, "Issue row"): check (Fixed) or minus-circle (Gone), title, outcome · date. */
export function ResolvedIssueRow({ issue }: ResolvedIssueRowProps) {
  const Icon = issue.outcome === 'GONE' ? CircleMinus : Check;
  return (
    <Link
      to="/vehicles/$vehicleId/issues/$issueId"
      params={{ vehicleId: issue.vehicleId, issueId: issue.id }}
      className="flex items-start gap-3 px-4 py-3.5 text-muted-foreground transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{issue.title}</span>
        <span className="text-xs">{resolvedIssueLine(issue)}</span>
      </span>
    </Link>
  );
}
