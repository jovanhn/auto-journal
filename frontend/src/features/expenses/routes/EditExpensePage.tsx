import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Expense } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeleteExpenseButton } from '../components/DeleteExpenseButton';
import { ExpenseForm } from '../components/ExpenseForm';
import { useDeleteExpense } from '../hooks/useDeleteExpense';
import { useExpense } from '../hooks/useExpense';
import { useUpdateExpense } from '../hooks/useUpdateExpense';
import { toExpenseRequest, type ExpenseFormInput, type ExpenseFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/expenses/$expenseId/edit');

const toFormInput = (expense: Expense): ExpenseFormInput => ({
  amount: { ...expense.amount },
  category: expense.category,
  date: expense.date,
  odometer: expense.odometer === null ? '' : String(expense.odometer),
  note: expense.note ?? '',
});

/** Edit expense: the Add expense form, pre-filled, with Delete at the bottom (specs/expenses.md, UI notes). */
export function EditExpensePage() {
  const { vehicleId, expenseId } = route.useParams();
  const navigate = route.useNavigate();
  const expense = useExpense(expenseId);
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense(vehicleId);
  const backToList = { to: '/vehicles/$vehicleId', params: { vehicleId } } as const;

  const handleSave = async (values: ExpenseFormValues) => {
    await updateExpense.mutateAsync({ expenseId, data: toExpenseRequest(values) });
    toast.success('Changes saved');
    await navigate(backToList);
  };

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync({ expenseId });
      toast.success('Expense deleted');
      await navigate(backToList);
    } catch {
      toast.error('Could not delete the expense. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit expense" cancelTo={backToList} />
      {expense.isPending ? (
        <LoadingState label="Loading expense…" rows={5} />
      ) : expense.isError ? (
        <ErrorState
          title="Could not load the expense"
          error={expense.error}
          onRetry={() => void expense.refetch()}
        />
      ) : (
        <ExpenseForm
          label="Edit expense"
          defaultValues={toFormInput(expense.data)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSave}
          footer={
            <DeleteExpenseButton deleting={deleteExpense.isPending} onConfirm={() => void handleDelete()} />
          }
        />
      )}
    </div>
  );
}
