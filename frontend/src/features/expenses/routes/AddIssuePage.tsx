import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { IssueForm } from '../components/IssueForm';
import { useCreateIssue } from '../hooks/useIssueMutations';
import { emptyIssue, toIssueRequest, type IssueFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/issues/new');

/**
 * New issue (design board *New issue*): Watch, I noticed and today by default. The limit (BR-L8, 409) is shown
 * above the form with the server's message.
 */
export function AddIssuePage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const createIssue = useCreateIssue();
  const backToIssues = { to: '/vehicles/$vehicleId/issues', params: { vehicleId } } as const;

  const handleCreate = async (values: IssueFormValues) => {
    await createIssue.mutateAsync({ vehicleId, data: toIssueRequest(values) });
    toast.success('Issue added');
    await navigate(backToIssues);
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="New issue" cancelTo={backToIssues} />
      <IssueForm
        label="New issue"
        defaultValues={emptyIssue()}
        submitLabel="Save issue"
        onSubmit={handleCreate}
      />
    </div>
  );
}
