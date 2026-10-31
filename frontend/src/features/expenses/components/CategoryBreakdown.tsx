import type { CategoryTotal } from '@/shared/api/generated/model';
import { formatMoney } from '@/shared/lib/money';
import { CATEGORY_LABELS } from '@/shared/lib/categories';

type CategoryBreakdownProps = {
  categories: readonly CategoryTotal[];
};

/** By-category breakdown (design: `CategoryBreakdown`): label, share · amount, and an 8 px bar of the share. */
export function CategoryBreakdown({ categories }: CategoryBreakdownProps) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Spending by category">
      {categories.map(({ category, total, sharePercent }) => (
        <li key={category} className="flex flex-col gap-1.5">
          <span className="flex justify-between text-sm">
            <span>{CATEGORY_LABELS[category]}</span>
            <span className="font-medium tabular-nums">
              <span className="font-normal text-muted-foreground">{sharePercent}% · </span>
              {formatMoney(total)}
            </span>
          </span>
          <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="h-2 w-full" aria-hidden="true">
            <rect width={100} height={8} rx={4} className="fill-muted" />
            <rect width={Math.min(sharePercent, 100)} height={8} rx={4} className="fill-primary" />
          </svg>
        </li>
      ))}
    </ul>
  );
}
