import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Issue } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeleteIssueButton } from '../components/DeleteIssueButton';
import { IssueForm } from '../components/IssueForm';
import { ResolveIssueSheet } from '../components/ResolveIssueSheet';
import { useDeleteIssue, useResolveIssue, useUpdateIssue } from '../hooks/useIssueMutations';
import { useIssue } from '../hooks/useIssues';
import {
  toIssueRequest,
  toResolveIssueRequest,
  type IssueFormInput,
  type IssueFormValues,
  type ResolveIssueFormValues,
} from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/issues/$issueId/edit');

const toFormInput = (issue: Issue): IssueFormInput => ({
  title: issue.title,
  severity: issue.severity,
  source: issue.source,
  noticedOn: issue.noticedOn,
  odometer: issue.odometer === null ? '' : String(issue.odometer),
  note: issue.note ?? '',
});

/**
 * Edit issue (design board *Edit issue*): the issue form, pre-filled, then Resolve issue (opens the sheet, open
 * issues only) and Delete issue (asks for confirmation) (BR-IS3, BR-IS5).
 */
export function EditIssuePage() {
  const { vehicleId, issueId } = route.useParams();
  const navigate = route.useNavigate();
  const issue = useIssue(issueId);
  const updateIssue = useUpdateIssue();
  const resolveIssue = useResolveIssue();
  const deleteIssue = useDeleteIssue(vehicleId);
  const backToIssues = { to: '/vehicles/$vehicleId/issues', params: { vehicleId } } as const;

  const handleSave = async (values: IssueFormValues) => {
    await updateIssue.mutateAsync({ issueId, data: toIssueRequest(values) });
    toast.success('Changes saved');
    await navigate(backToIssues);
  };

  const handleResolve = async (values: ResolveIssueFormValues) => {
    await resolveIssue.mutateAsync({ issueId, data: toResolveIssueRequest(values) });
    toast.success('Issue resolved');
    await navigate(backToIssues);
  };

  const handleDelete = async () => {
    try {
      await deleteIssue.mutateAsync({ issueId });
      toast.success('Issue deleted');
      await navigate(backToIssues);
    } catch {
      toast.error('Could not delete the issue. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit issue" cancelTo={backToIssues} />
      {issue.isPending ? (
        <LoadingState label="Loading issue…" rows={5} />
      ) : issue.isError ? (
        <ErrorState
          title="Could not load the issue"
          error={issue.error}
          onRetry={() => void issue.refetch()}
        />
      ) : (
        <IssueForm
          key={issue.data.id}
          label="Edit issue"
          defaultValues={toFormInput(issue.data)}
          submitLabel="Save changes"
          onSubmit={handleSave}
          footer={
            <div className="flex flex-col gap-2 border-t pt-5">
              {issue.data.status === 'OPEN' && (
                <ResolveIssueSheet issue={issue.data} onResolve={handleResolve} />
              )}
              <DeleteIssueButton deleting={deleteIssue.isPending} onConfirm={() => void handleDelete()} />
            </div>
          }
        />
      )}
    </div>
  );
}
