import type { Money } from '@/shared/api/generated/model';

const formatters = new Map<string, Intl.NumberFormat>();

const formatter = (key: string, options: Intl.NumberFormatOptions) => {
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat('en-US', options);
    formatters.set(key, cached);
  }
  return cached;
};

/**
 * A money value as shown in lists and cards: currency symbol, thousands comma, cents only when there are
 * any (`€8,500`, `€8,547.01`). The backend has already converted and rounded it (ADR 0014).
 */
export function formatMoney({ amount, currency }: Money): string {
  const value = Number(amount);
  const digits = Number.isInteger(value) ? 0 : 2;
  return formatter(`${currency}:${digits}`, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/** An amount exactly as entered, with its currency code: `1,000,000.00 RSD`. */
export function formatMoneyExact({ amount, currency }: Money): string {
  const number = formatter('exact', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(amount),
  );
  return `${number} ${currency}`;
}

/** A distance in kilometres: `184,320 km`. */
export function formatKm(km: number): string {
  return `${formatter('km', { maximumFractionDigits: 0 }).format(km)} km`;
}
