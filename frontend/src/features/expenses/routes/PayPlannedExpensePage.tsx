import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { PlannedExpense } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ExpenseForm } from '../components/ExpenseForm';
import { usePayPlannedExpense } from '../hooks/usePayPlannedExpense';
import { usePlannedExpenses } from '../hooks/usePlannedExpenses';
import { toExpenseRequest, type ExpenseFormInput, type ExpenseFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/planned/$plannedExpenseId/pay');

/** BR-PL2: pre-filled from the plan; amount, currency, date, odometer and note can change, the category cannot. */
const toFormInput = (plan: PlannedExpense): ExpenseFormInput => ({
  amount: { ...plan.estimatedAmount },
  category: plan.category,
  date: plan.dueDate,
  odometer: '',
  note: plan.note ?? '',
});

/** Mark as paid: the Add expense form titled "Mark as paid"; Save records the expense and updates the plan. */
export function PayPlannedExpensePage() {
  const { vehicleId, plannedExpenseId } = route.useParams();
  const navigate = route.useNavigate();
  const plans = usePlannedExpenses(vehicleId);
  const payPlan = usePayPlannedExpense();
  const backToPlanned = { to: '/vehicles/$vehicleId/planned', params: { vehicleId } } as const;
  const plan = plans.data?.items.find((item) => item.id === plannedExpenseId);

  const handlePay = async (values: ExpenseFormValues) => {
    await payPlan.mutateAsync({ plannedExpenseId, data: toExpenseRequest(values) });
    toast.success('Expense recorded');
    await navigate(backToPlanned);
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Mark as paid" cancelTo={backToPlanned} />
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
        <ExpenseForm
          label="Mark as paid"
          defaultValues={toFormInput(plan)}
          submitLabel="Save expense"
          submittingLabel="Saving…"
          onSubmit={handlePay}
          categoryLocked
        />
      )}
    </div>
  );
}
