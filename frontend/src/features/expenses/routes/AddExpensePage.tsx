import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { ExpenseForm } from '../components/ExpenseForm';
import { useCreateExpense } from '../hooks/useCreateExpense';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { todayIso, toExpenseRequest, type ExpenseFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/expenses/new');

/**
 * Add expense (design screen 05) for the vehicle the FAB was on: no vehicle picker. The currency defaults to
 * the display currency (BR-C2), the date to today. Save returns to the list.
 */
export function AddExpensePage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const displayCurrency = useDisplayCurrency();
  const createExpense = useCreateExpense();
  const backToList = { to: '/vehicles/$vehicleId', params: { vehicleId } } as const;

  const handleCreate = async (values: ExpenseFormValues) => {
    await createExpense.mutateAsync({ vehicleId, data: toExpenseRequest(values) });
    toast.success('Expense added');
    await navigate(backToList);
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="New expense" cancelTo={backToList} />
      {displayCurrency.isPending ? (
        <LoadingState label="Loading…" rows={5} />
      ) : displayCurrency.isError ? (
        <ErrorState
          title="Could not load the form"
          error={displayCurrency.error}
          onRetry={() => void displayCurrency.refetch()}
        />
      ) : (
        <ExpenseForm
          label="New expense"
          defaultValues={{
            amount: { amount: '', currency: displayCurrency.data },
            category: '',
            date: todayIso(),
            odometer: '',
            note: '',
          }}
          submitLabel="Save expense"
          submittingLabel="Saving…"
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
