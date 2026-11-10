/** Stat explanations shown by the ⓘ popovers (specs/metric-info.md); keep in sync with the BR-I rules. */
export const metricInfo = {
  yearTotal: (year: number) => `Sum of all expenses dated in ${year}.`,
  lifetimeCostPerKm:
    'Lifetime cost per km: (all expenses + purchase price) ÷ km driven (current odometer − odometer at start). "—" until some km are driven.',
  allTimeTotal: 'Sum of all expenses of this vehicle.',
  yearAverage: (year: number) =>
    `${year} total ÷ months elapsed: 12 for a past year, January to now for this year. Months without expenses count.`,
  allTimeAverage: 'Total ÷ months from the purchase date (or the first expense, if earlier) to now.',
  yearDistance: (year: number) =>
    `Highest odometer reading by the end of ${year} − highest by the end of the year before, from expense readings. "—" when no expense in ${year} has an odometer reading.`,
  allTimeDistance: 'Current odometer − odometer at start.',
  yearCostPerKm: (year: number) =>
    `${year} total ÷ distance in ${year}; the purchase price is not included. "—" when the distance is unknown or 0.`,
  journalSpent: 'Sum of the expenses shown (period, type and search). Log entries never count.',
  journalAverage:
    'Spent ÷ months: 12 for a past year, January to now for this year; for All, from the purchase date (or the first expense, if earlier) to now. Months without expenses count.',
  journalEntries: 'Number of expenses and log entries shown.',
  carValue: 'The purchase price for now; later it will be estimated from age and market data.',
};
