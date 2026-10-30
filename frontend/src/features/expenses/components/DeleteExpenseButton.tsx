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

type DeleteExpenseButtonProps = {
  deleting: boolean;
  onConfirm: () => void;
};

/** Delete at the bottom of Edit expense; asks for confirmation (specs/expenses.md, AC 8). */
export function DeleteExpenseButton({ deleting, onConfirm }: DeleteExpenseButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-destructive" disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete expense'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription>
            It is removed from all totals. This cannot be undone.
          </AlertDialogDescription>
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
