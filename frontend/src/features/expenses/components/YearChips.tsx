import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import type { JournalPeriod } from '../journal';

type YearChipsProps = {
  /** Newest first. */
  years: number[];
  selected: JournalPeriod;
  onChange: (period: JournalPeriod) => void;
};

const SCROLL_STEP = 200;

/**
 * Year chips "All · 2026 · 2025 …" in one row that scrolls sideways (design: Journal · scrolling year chips). On
 * devices that hover, arrows appear on hover to scroll the row.
 */
export function YearChips({ years, selected, onChange }: YearChipsProps) {
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    setEdges({
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
    };
  }, [measure, years.length]);

  const scrollBy = (left: number) => row.current?.scrollBy({ left, behavior: 'smooth' });
  const chips: { period: JournalPeriod; label: string }[] = [
    { period: 'all', label: 'All' },
    ...years.map((year) => ({ period: year, label: String(year) })),
  ];

  return (
    <div className="group relative -mx-5">
      <div
        ref={row}
        role="group"
        aria-label="Year"
        onScroll={measure}
        className="flex gap-1.5 overflow-x-auto scroll-px-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {chips.map(({ period, label }) => {
          const isSelected = period === selected;
          return (
            <Button
              key={label}
              type="button"
              variant={isSelected ? 'default' : 'outline'}
              aria-pressed={isSelected}
              className={cn('h-11 shrink-0 rounded-[10px] px-3 tabular-nums', !isSelected && 'bg-card')}
              onClick={() => {
                if (!isSelected) onChange(period);
              }}
            >
              {label}
            </Button>
          );
        })}
      </div>
      {!edges.atStart && <ScrollArrow side="left" onClick={() => scrollBy(-SCROLL_STEP)} />}
      {!edges.atEnd && <ScrollArrow side="right" onClick={() => scrollBy(SCROLL_STEP)} />}
    </div>
  );
}

type ScrollArrowProps = {
  side: 'left' | 'right';
  onClick: () => void;
};

function ScrollArrow({ side, onClick }: ScrollArrowProps) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Scroll years left' : 'Scroll years right'}
      onClick={onClick}
      className={cn(
        'absolute top-0 hidden h-11 w-15 items-center bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 pointer-fine:flex',
        side === 'left' ? 'left-0 justify-start pl-4' : 'right-0 justify-end pr-4',
      )}
    >
      <span className="flex size-8 items-center justify-center rounded-full border border-input bg-card text-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
    </button>
  );
}
