import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription } from './alert';

type FormErrorAlertProps = {
  /** Form-level (non-field) error, e.g. `form.formState.errors.root?.server?.message`. */
  message?: string;
};

export function FormErrorAlert({ message }: FormErrorAlertProps) {
  if (!message) return null;
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
