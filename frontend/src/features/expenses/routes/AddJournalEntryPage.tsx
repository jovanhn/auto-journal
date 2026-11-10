import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { useCreateExpense } from '../hooks/useCreateExpense';
import { useCreateLogEntry } from '../hooks/useCreateLogEntry';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { emptyJournalEntry, type JournalEntryFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/expenses/new');

/**
 * Add to journal (design screen 05, specs/journal.md) for the vehicle the FAB was on: no vehicle picker. Expense |
 * Log at the top (default Expense). The currency defaults to the display currency (BR-C2), the date to today. Save
 * returns to the journal.
 */
export function AddJournalEntryPage() {
  const { vehicleId } = route.useParams();
  const navigate = route.useNavigate();
  const displayCurrency = useDisplayCurrency();
  const createExpense = useCreateExpense();
  const createLogEntry = useCreateLogEntry();
  const backToJournal = { to: '/vehicles/$vehicleId', params: { vehicleId } } as const;

  const handleCreate = async (values: JournalEntryFormValues) => {
    if (values.kind === 'expense') {
      await createExpense.mutateAsync({ vehicleId, data: values.request });
      toast.success('Expense added');
    } else {
      await createLogEntry.mutateAsync({ vehicleId, data: values.request });
      toast.success('Log added');
    }
    await navigate(backToJournal);
  };

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Add to journal" cancelTo={backToJournal} />
      {displayCurrency.isPending ? (
        <LoadingState label="Loading…" rows={5} />
      ) : displayCurrency.isError ? (
        <ErrorState
          title="Could not load the form"
          error={displayCurrency.error}
          onRetry={() => void displayCurrency.refetch()}
        />
      ) : (
        <JournalEntryForm
          label="Add to journal"
          defaultValues={emptyJournalEntry('expense', displayCurrency.data)}
          submitLabel="Save"
          submittingLabel="Saving…"
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
