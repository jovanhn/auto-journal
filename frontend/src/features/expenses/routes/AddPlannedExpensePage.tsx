import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { PlannedExpenseForm } from '../components/PlannedExpenseForm';
import { useCreatePlannedExpense } from '../hooks/useCreatePlannedExpense';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { toPlannedExpenseRequest, type PlannedExpenseFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/planned/new');

/** Plan an expense for the vehicle; the currency defaults to the display currency (BR-C2). */
export function AddPlannedExpensePage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const displayCurrency = useDisplayCurrency();
  const createPlan = useCreatePlannedExpense();
  const backToPlanned = { to: '/vehicles/$vehicleId/planned', params: { vehicleId } } as const;

  const handleCreate = async (values: PlannedExpenseFormValues) => {
    await createPlan.mutateAsync({ vehicleId, data: toPlannedExpenseRequest(values) });
    toast.success('Expense planned');
    await navigate(backToPlanned);
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Plan an expense" cancelTo={backToPlanned} />
      {displayCurrency.isPending ? (
        <LoadingState label="Loading…" rows={5} />
      ) : displayCurrency.isError ? (
        <ErrorState
          title="Could not load the form"
          error={displayCurrency.error}
          onRetry={() => void displayCurrency.refetch()}
        />
      ) : (
        <PlannedExpenseForm
          label="Plan an expense"
          defaultValues={{
            category: '',
            estimatedAmount: { amount: '', currency: displayCurrency.data },
            dueDate: '',
            recurrenceMonths: '',
            note: '',
          }}
          submitLabel="Save plan"
          submittingLabel="Saving…"
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
