import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import type { JournalEntryKind } from '../schemas';

type DeleteEntryButtonProps = {
  kind: JournalEntryKind;
  deleting: boolean;
  onConfirm: () => void;
};

const TEXTS = {
  expense: {
    button: 'Delete expense',
    title: 'Delete this expense?',
    description: 'It is removed from all totals. This cannot be undone.',
  },
  log: {
    button: 'Delete log',
    title: 'Delete this log entry?',
    description: 'Its note and odometer reading are removed. This cannot be undone.',
  },
} as const;

/** Delete at the bottom of Edit expense / Edit log; asks for confirmation (specs/expenses.md AC8, specs/journal.md AC8). */
export function DeleteEntryButton({ kind, deleting, onConfirm }: DeleteEntryButtonProps) {
  const text = TEXTS[kind];
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-destructive" disabled={deleting}>
          {deleting ? 'Deleting…' : text.button}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{text.title}</AlertDialogTitle>
          <AlertDialogDescription>{text.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
