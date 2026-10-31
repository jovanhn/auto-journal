import { cn } from '@/shared/lib/utils';
import type { PlanStatus } from '../planning';

type StatusPillProps = {
  status: PlanStatus;
};

/** Status pill (design: `StatusPill`): warning ("Due in 24 days") or neutral ("In 4 months"). */
export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-1 text-xs',
        status.tone === 'warning'
          ? 'bg-warning-subtle font-semibold text-warning'
          : 'bg-divider font-medium text-muted-foreground',
      )}
    >
      {status.label}
    </span>
  );
}
