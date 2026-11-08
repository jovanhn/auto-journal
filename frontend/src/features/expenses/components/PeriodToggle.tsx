import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

type PeriodToggleProps = {
  allTime: boolean;
  onChange: (allTime: boolean) => void;
};

/** Insights period: Year | All time (toggle buttons with `aria-pressed`, like the category picker). */
export function PeriodToggle({ allTime, onChange }: PeriodToggleProps) {
  return (
    <div role="group" aria-label="Period" className="grid grid-cols-2 gap-2">
      {[
        { label: 'Year', all: false },
        { label: 'All time', all: true },
      ].map(({ label, all }) => {
        const selected = all === allTime;
        return (
          <Button
            key={label}
            type="button"
            variant={selected ? 'default' : 'outline'}
            aria-pressed={selected}
            className={cn('h-11', !selected && 'bg-card')}
            onClick={() => {
              if (!selected) onChange(all);
            }}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
