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

type DeletePlannedExpenseButtonProps = {
  deleting: boolean;
  onConfirm: () => void;
};

/** Delete at the bottom of Edit plan; asks for confirmation (specs/planned-expenses.md, AC 9). */
export function DeletePlannedExpenseButton({ deleting, onConfirm }: DeletePlannedExpenseButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-destructive" disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete plan'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this planned expense?</AlertDialogTitle>
          <AlertDialogDescription>
            It is removed from the projection. No expense is recorded.
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
