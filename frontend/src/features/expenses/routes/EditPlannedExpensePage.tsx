import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { PlannedExpense } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeletePlannedExpenseButton } from '../components/DeletePlannedExpenseButton';
import { PlannedExpenseForm } from '../components/PlannedExpenseForm';
import { useDeletePlannedExpense } from '../hooks/useDeletePlannedExpense';
import { usePlannedExpenses } from '../hooks/usePlannedExpenses';
import { useUpdatePlannedExpense } from '../hooks/useUpdatePlannedExpense';
import {
  toPlannedExpenseRequest,
  type PlannedExpenseFormInput,
  type PlannedExpenseFormValues,
} from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/planned/$plannedExpenseId/edit');

const toFormInput = (plan: PlannedExpense): PlannedExpenseFormInput => ({
  category: plan.category,
  estimatedAmount: { ...plan.estimatedAmount },
  dueDate: plan.dueDate,
  recurrenceMonths: plan.recurrenceMonths === null ? '' : String(plan.recurrenceMonths),
  note: plan.note ?? '',
});

/** Edit plan: the plan form, pre-filled, with Delete at the bottom (BR-PL4). The plan comes from the vehicle's list. */
export function EditPlannedExpensePage() {
  const { vehicleId, plannedExpenseId } = route.useParams();
  const navigate = route.useNavigate();
  const plans = usePlannedExpenses(vehicleId);
  const updatePlan = useUpdatePlannedExpense();
  const deletePlan = useDeletePlannedExpense(vehicleId);
  const backToPlanned = { to: '/vehicles/$vehicleId/planned', params: { vehicleId } } as const;
  const plan = plans.data?.items.find((item) => item.id === plannedExpenseId);

  const handleSave = async (values: PlannedExpenseFormValues) => {
    await updatePlan.mutateAsync({ plannedExpenseId, data: toPlannedExpenseRequest(values) });
    toast.success('Changes saved');
    await navigate(backToPlanned);
  };

  const handleDelete = async () => {
    try {
      await deletePlan.mutateAsync({ plannedExpenseId });
      toast.success('Planned expense deleted');
      await navigate(backToPlanned);
    } catch {
      toast.error('Could not delete the planned expense. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit plan" cancelTo={backToPlanned} />
      {plans.isPending ? (
        <LoadingState label="Loading planned expense…" rows={5} />
      ) : plans.isError ? (
        <ErrorState
          title="Could not load the planned expense"
          error={plans.error}
          onRetry={() => void plans.refetch()}
        />
      ) : !plan ? (
        <ErrorState
          title="Planned expense not found"
          error={new Error('It may have been paid or deleted.')}
        />
      ) : (
        <PlannedExpenseForm
          label="Edit plan"
          defaultValues={toFormInput(plan)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSave}
          footer={
            <DeletePlannedExpenseButton
              deleting={deletePlan.isPending}
              onConfirm={() => void handleDelete()}
            />
          }
        />
      )}
    </div>
  );
}
