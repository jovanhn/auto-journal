import { Currency } from '@/shared/api/generated/model';

/** Supported currencies (BR-C1) in display order, with their names for selects. */
export const CURRENCIES: readonly Currency[] = [Currency.EUR, Currency.RSD, Currency.USD];

export const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: 'Euro',
  RSD: 'Serbian dinar',
  USD: 'US dollar',
};
