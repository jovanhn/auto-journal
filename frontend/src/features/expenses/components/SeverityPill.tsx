import type { IssueSeverity } from '@/shared/api/generated/model';
import { cn } from '@/shared/lib/utils';
import { SEVERITY_LABELS } from '../issues';

type SeverityPillProps = {
  severity: IssueSeverity;
};

/** Severity pill (design.md, "Severity pill"): Urgent = warning, Fix soon = neutral filled, Watch = outline. */
export function SeverityPill({ severity }: SeverityPillProps) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs',
        severity === 'URGENT' && 'bg-warning-subtle font-semibold text-warning',
        severity === 'FIX_SOON' && 'bg-divider font-semibold text-foreground',
        severity === 'WATCH' &&
          'border border-input bg-card px-[9px] py-[3px] font-medium text-muted-foreground',
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
