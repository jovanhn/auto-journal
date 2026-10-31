import type { Money } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';

type ProjectionHeroProps = {
  total: Money;
};

/** Planned hero (design: `HeroSummary`): the 12-month projection from planned expenses only (BR-I5). */
export function ProjectionHero({ total }: ProjectionHeroProps) {
  return (
    <section
      aria-label="Projected cost"
      className="flex flex-col gap-2 rounded-2xl bg-inverse p-5 text-inverse-foreground"
    >
      <span className="text-sm text-inverse-muted">Projected · next 12 months</span>
      <span className="text-4xl font-semibold tabular-nums">≈ {formatMoney(total)}</span>
      <span className="text-xs text-inverse-faint">From your planned expenses</span>
    </section>
  );
}
