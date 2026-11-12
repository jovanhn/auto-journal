import { getRouteApi, Link, Navigate } from '@tanstack/react-router';
import { Check, ChevronLeft, CircleMinus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { Issue } from '@/shared/api/generated/model';
import { mediumDate } from '@/shared/lib/dates';
import { formatKm } from '@/shared/lib/money';
import { Button } from '@/shared/ui/button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { useReopenIssue } from '../hooks/useIssueMutations';
import { useIssue } from '../hooks/useIssues';
import { useVehicle } from '../hooks/useVehicle';
import { OUTCOME_LABELS, outcomeOf, SEVERITY_LABELS, SOURCE_LABELS } from '../issues';

const route = getRouteApi('/_app/vehicles/$vehicleId/issues/$issueId');

/**
 * Resolved issue (design board *Resolved issue*): outcome pill, title, resolved date, details, the note and Reopen
 * issue (BR-IS4). Delete is reached by reopening. An open issue shows its edit screen instead.
 */
export function ResolvedIssuePage() {
  const { vehicleId, issueId } = route.useParams();
  const navigate = route.useNavigate();
  const vehicle = useVehicle(vehicleId);
  const issue = useIssue(issueId);
  const reopenIssue = useReopenIssue();
  const backToIssues = { to: '/vehicles/$vehicleId/issues', params: { vehicleId } } as const;

  const handleReopen = async () => {
    try {
      await reopenIssue.mutateAsync({ issueId });
      toast.success('Issue reopened');
      await navigate(backToIssues);
    } catch {
      toast.error('Could not reopen the issue. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="-ml-3 size-11" asChild>
          <Link {...backToIssues} aria-label="Back to issues">
            <ChevronLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        </Button>
        <div className="flex min-w-0 flex-col">
          <p className="text-[17px] font-semibold">Issue</p>
          <p className="truncate text-sm text-muted-foreground">{vehicle.data?.nickname ?? ''}</p>
        </div>
      </div>
      {issue.isPending ? (
        <LoadingState label="Loading issue…" rows={4} />
      ) : issue.isError ? (
        <ErrorState
          title="Could not load the issue"
          error={issue.error}
          onRetry={() => void issue.refetch()}
        />
      ) : issue.data.status === 'OPEN' ? (
        <Navigate to="/vehicles/$vehicleId/issues/$issueId/edit" params={{ vehicleId, issueId }} replace />
      ) : (
        <ResolvedIssueDetails
          issue={issue.data}
          reopening={reopenIssue.isPending}
          onReopen={() => void handleReopen()}
        />
      )}
    </div>
  );
}

type ResolvedIssueDetailsProps = {
  issue: Issue;
  reopening: boolean;
  onReopen: () => void;
};

function ResolvedIssueDetails({ issue, reopening, onReopen }: ResolvedIssueDetailsProps) {
  const outcome = outcomeOf(issue);
  const OutcomeIcon = outcome === 'GONE' ? CircleMinus : Check;
  return (
    <>
      <div className="flex flex-col items-start gap-2">
        <span className="flex items-center gap-1 rounded-full bg-divider px-2.5 py-1 text-xs font-semibold">
          <OutcomeIcon className="size-3.5" aria-hidden="true" />
          {outcome && OUTCOME_LABELS[outcome]}
        </span>
        <h1 className="text-xl font-semibold">{issue.title}</h1>
        {issue.resolvedOn && (
          <p className="text-sm text-muted-foreground">Resolved {mediumDate(issue.resolvedOn)}</p>
        )}
      </div>
      <dl className="divide-y divide-divider rounded-2xl border bg-card text-sm">
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">Severity</dt>
          <dd className="font-medium">{SEVERITY_LABELS[issue.severity]}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">Source</dt>
          <dd className="font-medium">{SOURCE_LABELS[issue.source]}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">Noticed</dt>
          <dd className="font-medium tabular-nums">
            {mediumDate(issue.noticedOn)}
            {issue.odometer !== null && ` · ${formatKm(issue.odometer)}`}
          </dd>
        </div>
      </dl>
      {issue.note && (
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-muted-foreground">Note</h2>
          <p className="text-sm whitespace-pre-line">{issue.note}</p>
        </div>
      )}
      <Button variant="outline" size="lg" disabled={reopening} onClick={onReopen}>
        <RotateCcw aria-hidden="true" />
        {reopening ? 'Reopening…' : 'Reopen issue'}
      </Button>
    </>
  );
}
