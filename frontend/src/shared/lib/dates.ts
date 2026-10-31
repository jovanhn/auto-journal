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

/** `Mar 2, 2027` for `2027-03-02`. */
export const mediumDate = (isoDate: string): string =>
  `${shortDate(isoDate)}, ${Number(isoDate.slice(0, 4))}`;

const utcDay = (isoDate: string): number =>
  Date.UTC(Number(isoDate.slice(0, 4)), Number(isoDate.slice(5, 7)) - 1, Number(isoDate.slice(8, 10)));

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string): number =>
  Math.round((utcDay(to) - utcDay(from)) / 86_400_000);

/** Whole calendar months from `from` to `to` (`2026-10-21` → `2027-03-02` is 4). */
export const monthsBetween = (from: string, to: string): number => {
  const months =
    (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
    (Number(to.slice(5, 7)) - Number(from.slice(5, 7)));
  return Number(to.slice(8, 10)) < Number(from.slice(8, 10)) ? months - 1 : months;
};
