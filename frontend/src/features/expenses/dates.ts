const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** `October` for month index 0–11. */
export const monthName = (index: number): string => MONTHS[index] ?? '';

/** Month index 0–11 of an ISO date (`2026-10-18` → 9), without time-zone shifts. */
export const monthIndexOf = (isoDate: string): number => Number(isoDate.slice(5, 7)) - 1;

/** `Oct 18` for `2026-10-18`. */
export const shortDate = (isoDate: string): string =>
  `${monthName(monthIndexOf(isoDate)).slice(0, 3)} ${Number(isoDate.slice(8, 10))}`;
