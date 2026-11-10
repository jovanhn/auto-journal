import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Expense } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeleteEntryButton } from '../components/DeleteEntryButton';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { useConvertExpenseToLogEntry } from '../hooks/useConvertJournalEntry';
import { useDeleteExpense } from '../hooks/useDeleteExpense';
import { useExpense } from '../hooks/useExpense';
import { useUpdateExpense } from '../hooks/useUpdateExpense';
import type { JournalEntryFormInput, JournalEntryFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/expenses/$expenseId/edit');

const toFormInput = (expense: Expense): JournalEntryFormInput => ({
  kind: 'expense',
  amount: { ...expense.amount },
  category: expense.category,
  date: expense.date,
  odometer: expense.odometer === null ? '' : String(expense.odometer),
  note: expense.note ?? '',
  approximate: expense.approximate,
});

/**
 * Edit expense: the journal form, pre-filled, with Delete at the bottom (specs/expenses.md, UI notes). Switching to
 * Log and saving removes the cost after confirmation (specs/journal.md AC17).
 */
export function EditExpensePage() {
  const { vehicleId, expenseId } = route.useParams();
  const navigate = route.useNavigate();
  const expense = useExpense(expenseId);
  const updateExpense = useUpdateExpense();
  const convertToLog = useConvertExpenseToLogEntry();
  const deleteExpense = useDeleteExpense(vehicleId);
  const backToJournal = { to: '/vehicles/$vehicleId', params: { vehicleId } } as const;

  const handleSave = async (values: JournalEntryFormValues) => {
    if (values.kind === 'expense') {
      await updateExpense.mutateAsync({ expenseId, data: values.request });
      toast.success('Changes saved');
    } else {
      await convertToLog.mutateAsync({ expenseId, data: values.request });
      toast.success('Saved as a log');
    }
    await navigate(backToJournal);
  };

  const handleDelete = async () => {
    try {
      await deleteExpense.mutateAsync({ expenseId });
      toast.success('Expense deleted');
      await navigate(backToJournal);
    } catch {
      toast.error('Could not delete the expense. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit expense" cancelTo={backToJournal} />
      {expense.isPending ? (
        <LoadingState label="Loading expense…" rows={5} />
      ) : expense.isError ? (
        <ErrorState
          title="Could not load the expense"
          error={expense.error}
          onRetry={() => void expense.refetch()}
        />
      ) : (
        <JournalEntryForm
          label="Edit expense"
          defaultValues={toFormInput(expense.data)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSave}
          confirmCostRemoval
          footer={
            <DeleteEntryButton
              kind="expense"
              deleting={deleteExpense.isPending}
              onConfirm={() => void handleDelete()}
            />
          }
        />
      )}
    </div>
  );
}
