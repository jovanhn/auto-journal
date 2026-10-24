import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';

type ErrorStateProps = {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
};

const messageOf = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : 'Something went wrong.';

export function ErrorState({ title = 'Could not load data', error, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive">
      <CircleAlert aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{messageOf(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
