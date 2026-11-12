import { cn } from '@/shared/lib/utils';

type BarChartProps = {
  /** Bar values, left to right. */
  amounts: readonly number[];
  /** One short label under each bar. */
  labels: readonly string[];
  /** The highlighted bar's index. */
  highlighted: number | null;
  /** Screen-reader summary of the chart. */
  summary: string;
};

/** Bar heights are in viewBox units; the tallest bar fills the chart. */
const HEIGHT = 100;
const BAR_WIDTH = 6;
const GAP = 4;

/**
 * Bar chart drawn as plain SVG (no chart library): `role="img"` with an `aria-label` summary, the highlighted
 * bar in `accent`, the others `chart-muted`, mono labels underneath (design: `MonthlyBarChart`).
 */
export function BarChart({ amounts, labels, highlighted, summary }: BarChartProps) {
  const max = Math.max(...amounts, 0);
  return (
    <div className="flex flex-col gap-2">
      <svg
        role="img"
        aria-label={summary}
        viewBox={`0 0 ${amounts.length * (BAR_WIDTH + GAP) - GAP} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-32 w-full border-b"
      >
        {amounts.map((amount, index) => {
          const height = max > 0 ? Math.max((amount / max) * HEIGHT, amount > 0 ? 2 : 0) : 0;
          return (
            <rect
              key={index}
              x={index * (BAR_WIDTH + GAP)}
              y={HEIGHT - height}
              width={BAR_WIDTH}
              height={height}
              rx={1}
              className={cn(index === highlighted ? 'fill-primary' : 'fill-chart-muted')}
            />
          );
        })}
      </svg>
      <div aria-hidden="true" className="flex font-mono text-[11px] text-muted-foreground">
        {labels.map((label, index) => (
          <span key={index} className={cn('flex-1 text-center', index === highlighted && 'text-foreground')}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
