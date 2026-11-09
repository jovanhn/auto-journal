import { cn } from '@/shared/lib/utils';
import { MetricInfo } from '@/shared/ui/MetricInfo';

type StatTileProps = {
  label: string;
  value: string;
  /** Small text under the value, e.g. "Purchase price". */
  caption?: string;
  /** `inverse` is the dark tile (Insights "Total spent"); `large` the 24 px value of the Insights tiles. */
  variant?: 'default' | 'inverse';
  size?: 'small' | 'large';
  /** How the stat is calculated; adds an ⓘ popover next to the label (specs/metric-info.md). */
  info?: string;
};

/** Stat tile (design: `StatTile`): label above the value, optional caption. */
export function StatTile({
  label,
  value,
  caption,
  variant = 'default',
  size = 'small',
  info,
}: StatTileProps) {
  const inverse = variant === 'inverse';
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl border p-3',
        inverse ? 'border-inverse bg-inverse text-inverse-foreground' : 'bg-card',
      )}
    >
      <span
        className={cn(
          'flex items-center justify-between gap-1 text-xs font-medium',
          inverse ? 'text-inverse-muted' : 'text-muted-foreground',
        )}
      >
        {label}
        {info && <MetricInfo label={label} text={info} inverse={inverse} />}
      </span>
      <span className={cn('font-semibold tabular-nums', size === 'large' ? 'text-2xl' : 'text-lg')}>
        {value}
      </span>
      {caption && (
        <span className={cn('text-xs', inverse ? 'text-inverse-muted' : 'text-muted-foreground')}>
          {caption}
        </span>
      )}
    </div>
  );
}
