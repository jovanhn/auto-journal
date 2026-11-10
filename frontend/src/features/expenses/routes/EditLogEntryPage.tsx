import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { Currency, LogEntry } from '@/shared/api/generated/model';
import { ErrorState } from '@/shared/ui/ErrorState';
import { FormPageHeader } from '@/shared/ui/FormPageHeader';
import { LoadingState } from '@/shared/ui/LoadingState';
import { DeleteEntryButton } from '../components/DeleteEntryButton';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { useConvertLogEntryToExpense } from '../hooks/useConvertJournalEntry';
import { useDeleteLogEntry } from '../hooks/useDeleteLogEntry';
import { useDisplayCurrency } from '../hooks/useDisplayCurrency';
import { useLogEntry } from '../hooks/useLogEntry';
import { useUpdateLogEntry } from '../hooks/useUpdateLogEntry';
import { emptyJournalEntry, type JournalEntryFormInput, type JournalEntryFormValues } from '../schemas';

const route = getRouteApi('/_app/vehicles/$vehicleId/log-entries/$logEntryId/edit');

const toFormInput = (entry: LogEntry, currency: Currency): JournalEntryFormInput => ({
  ...emptyJournalEntry('log', currency),
  date: entry.date,
  odometer: entry.odometer === null ? '' : String(entry.odometer),
  note: entry.note ?? '',
});

/**
 * Edit log (specs/journal.md, UI notes): the journal form set to Log, pre-filled, with Delete at the bottom.
 * Switching to Expense shows the cost fields (currency defaults to the display currency); saving converts it
 * (AC16).
 */
export function EditLogEntryPage() {
  const { vehicleId, logEntryId } = route.useParams();
  const navigate = route.useNavigate();
  const logEntry = useLogEntry(logEntryId);
  const displayCurrency = useDisplayCurrency();
  const updateLogEntry = useUpdateLogEntry();
  const convertToExpense = useConvertLogEntryToExpense();
  const deleteLogEntry = useDeleteLogEntry(vehicleId);
  // Back to the journal with its filters (specs/journal-filters.md AC8).
  const backToJournal = {
    to: '/vehicles/$vehicleId',
    params: { vehicleId },
    search: route.useSearch(),
  } as const;

  const handleSave = async (values: JournalEntryFormValues) => {
    if (values.kind === 'log') {
      await updateLogEntry.mutateAsync({ logEntryId, data: values.request });
      toast.success('Changes saved');
    } else {
      await convertToExpense.mutateAsync({ logEntryId, data: values.request });
      toast.success('Saved as an expense');
    }
    await navigate(backToJournal);
  };

  const handleDelete = async () => {
    try {
      await deleteLogEntry.mutateAsync({ logEntryId });
      toast.success('Log deleted');
      await navigate(backToJournal);
    } catch {
      toast.error('Could not delete the log. Please try again.');
    }
  };

  const failed = logEntry.isError ? logEntry : displayCurrency.isError ? displayCurrency : null;

  return (
    <div className="flex flex-col gap-6">
      <FormPageHeader title="Edit log" cancelTo={backToJournal} />
      {logEntry.isPending || displayCurrency.isPending ? (
        <LoadingState label="Loading log…" rows={4} />
      ) : failed ? (
        <ErrorState
          title="Could not load the log"
          error={failed.error}
          onRetry={() => void failed.refetch()}
        />
      ) : logEntry.data && displayCurrency.data ? (
        <JournalEntryForm
          label="Edit log"
          defaultValues={toFormInput(logEntry.data, displayCurrency.data)}
          submitLabel="Save changes"
          submittingLabel="Saving…"
          onSubmit={handleSave}
          footer={
            <DeleteEntryButton
              kind="log"
              deleting={deleteLogEntry.isPending}
              onConfirm={() => void handleDelete()}
            />
          }
        />
      ) : null}
    </div>
  );
}
