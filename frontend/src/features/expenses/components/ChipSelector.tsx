import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

type ChipSelectorProps<T extends string> = {
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
  onBlur?: () => void;
};

/**
 * Chip selector (design.md, "Chip selector"): equal-width toggle buttons in one row, the selected one filled
 * with the accent (`aria-pressed`). Used for severity, source and outcome.
 */
export function ChipSelector<T extends string>({
  options,
  labels,
  value,
  onChange,
  onBlur,
}: ChipSelectorProps<T>) {
  return (
    <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
      {options.map((option) => {
        const selected = value === option;
        return (
          <Button
            key={option}
            type="button"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            className={cn('h-11 px-2', !selected && 'bg-card font-medium')}
            onClick={() => {
              onChange(option);
            }}
            onBlur={onBlur}
          >
            {labels[option]}
          </Button>
        );
      })}
    </div>
  );
}
