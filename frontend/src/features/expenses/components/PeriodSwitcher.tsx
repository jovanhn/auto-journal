import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';

type PeriodSwitcherProps = {
  year: number;
  firstYear: number;
  lastYear: number;
  onChange: (year: number) => void;
};

/** Year switcher (design: `PeriodSwitcher`); prev/next are disabled at the ends of the range (AC 4). */
export function PeriodSwitcher({ year, firstYear, lastYear, onChange }: PeriodSwitcherProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-card">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="Previous year"
        disabled={year <= firstYear}
        onClick={() => {
          onChange(year - 1);
        }}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <span className="text-sm font-semibold tabular-nums" aria-live="polite">
        {year}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="Next year"
        disabled={year >= lastYear}
        onClick={() => {
          onChange(year + 1);
        }}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
}
