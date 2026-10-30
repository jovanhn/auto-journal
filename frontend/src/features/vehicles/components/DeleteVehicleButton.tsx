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

type DeleteVehicleButtonProps = {
  nickname: string;
  deleting: boolean;
  onConfirm: () => void;
};

/** Delete asks for confirmation naming what will be deleted (specs/vehicles.md, AC 9). */
export function DeleteVehicleButton({ nickname, deleting, onConfirm }: DeleteVehicleButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="lg" className="text-destructive" disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete vehicle'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {nickname}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the vehicle and all of its expenses and planned expenses. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete vehicle
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
