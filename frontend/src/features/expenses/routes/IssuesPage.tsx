import { getRouteApi, Link } from '@tanstack/react-router';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useState } from 'react';
import type { IssueList } from '@/shared/api/generated/model';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { IssueRow } from '../components/IssueRow';
import { ResolvedIssueRow } from '../components/ResolvedIssueRow';
import { VehicleAppBar } from '../components/VehicleAppBar';
import { VehicleTabBar } from '../components/VehicleTabBar';
import { useIssues } from '../hooks/useIssues';
import { useVehicle } from '../hooks/useVehicle';

const route = getRouteApi('/_app/vehicles/$vehicleId/issues');

/**
 * Vehicle · Issues (design boards *Issues · open*, *· resolved expanded*, *· empty*, *· only resolved*): open
 * issues by severity, a collapsed Resolved section and the Add issue FAB (specs/issues.md).
 */
export function IssuesPage() {
  const { vehicleId } = route.useParams();
  const vehicle = useVehicle(vehicleId);
  const issues = useIssues(vehicleId);

  return (
    <div className="flex flex-col gap-4 pb-40">
      <VehicleAppBar
        vehicleId={vehicleId}
        title={vehicle.isPending ? undefined : vehicle.isError ? 'Vehicle' : vehicle.data.nickname}
        subtitle="Issues"
      />
      {vehicle.isError ? (
        <ErrorState
          title="Could not load the vehicle"
          error={vehicle.error}
          onRetry={() => void vehicle.refetch()}
        />
      ) : issues.isPending ? (
        <LoadingState label="Loading issues…" rows={4} />
      ) : issues.isError ? (
        <ErrorState
          title="Could not load the issues"
          error={issues.error}
          onRetry={() => void issues.refetch()}
        />
      ) : (
        <IssuesView data={issues.data} />
      )}
      <Button
        asChild
        size="lg"
        className="fixed right-5 bottom-24 z-10 h-13 rounded-full px-5 shadow-[0_4px_14px_rgb(22_24_29/0.18)]"
      >
        <Link to="/vehicles/$vehicleId/issues/new" params={{ vehicleId }}>
          <Plus className="size-[18px]" aria-hidden="true" />
          Add issue
        </Link>
      </Button>
      <VehicleTabBar vehicleId={vehicleId} />
    </div>
  );
}

type IssuesViewProps = {
  data: IssueList;
};

function IssuesView({ data }: IssuesViewProps) {
  const [resolvedOpen, setResolvedOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const { open, resolved } = data;

  return (
    <>
      {open.length === 0 ? (
        <EmptyState
          title="No open issues"
          description={
            resolved.length === 0
              ? 'Note a warning light, a noise or something your mechanic said to keep an eye on.'
              : 'Nothing to keep an eye on right now.'
          }
        />
      ) : (
        <section aria-labelledby="open-issues" className="flex flex-col gap-2">
          <h2 id="open-issues" className="px-1 text-sm font-semibold text-muted-foreground">
            Open · {open.length}
          </h2>
          <ul
            aria-label="Open issues"
            className="divide-y divide-divider overflow-hidden rounded-2xl border bg-card"
          >
            {open.map((issue) => (
              <li key={issue.id}>
                <IssueRow issue={issue} currentYear={currentYear} />
              </li>
            ))}
          </ul>
        </section>
      )}
      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2>
            <button
              type="button"
              aria-expanded={resolvedOpen}
              aria-controls="resolved-issues"
              onClick={() => {
                setResolvedOpen((value) => !value);
              }}
              className="flex min-h-11 w-full items-center justify-between rounded-md px-1 text-sm font-semibold text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Resolved · {resolved.length}
              {resolvedOpen ? (
                <ChevronUp className="size-5" aria-hidden="true" />
              ) : (
                <ChevronDown className="size-5" aria-hidden="true" />
              )}
            </button>
          </h2>
          {resolvedOpen && (
            <ul
              id="resolved-issues"
              aria-label="Resolved issues"
              className="divide-y divide-divider overflow-hidden rounded-2xl border bg-card"
            >
              {resolved.map((issue) => (
                <li key={issue.id}>
                  <ResolvedIssueRow issue={issue} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
