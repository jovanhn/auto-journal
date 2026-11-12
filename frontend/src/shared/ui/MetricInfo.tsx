import { Info } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover';

type MetricInfoProps = {
  /** Stat name: the popover title and the button's "About <label>". */
  label: string;
  /** How the stat is calculated (specs/metric-info.md). */
  text: string;
  /** Muted colour for dark (inverse) surfaces. */
  inverse?: boolean;
};

/** ⓘ button that opens a popover explaining a stat (specs/metric-info.md). */
export function MetricInfo({ label, text, inverse = false }: MetricInfoProps) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`About ${label}`}
        className={cn(
          // 14 px icon inside a 44 px tap area; negative margins keep the tile layout unchanged.
          '-m-[15px] inline-flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
          inverse ? 'text-inverse-muted' : 'text-muted-foreground',
        )}
      >
        <Info className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[280px] gap-1">
        <PopoverTitle>{label}</PopoverTitle>
        <PopoverDescription>{text}</PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
