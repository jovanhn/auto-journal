import { Skeleton } from './skeleton';

type LoadingStateProps = {
  /** Accessible label announced to screen readers. */
  label?: string;
  rows?: number;
};

export function LoadingState({ label = 'Loading…', rows = 3 }: LoadingStateProps) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
