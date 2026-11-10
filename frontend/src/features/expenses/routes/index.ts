import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '@/app/authenticatedRoute';
import { isJournalType, type JournalSearch } from '../journal';
import { AddJournalEntryPage } from './AddJournalEntryPage';
import { AddPlannedExpensePage } from './AddPlannedExpensePage';
import { EditExpensePage } from './EditExpensePage';
import { EditLogEntryPage } from './EditLogEntryPage';
import { EditPlannedExpensePage } from './EditPlannedExpensePage';
import { InsightsPage } from './InsightsPage';
import { PayPlannedExpensePage } from './PayPlannedExpensePage';
import { PlannedPage } from './PlannedPage';
import { VehicleExpensesPage } from './VehicleExpensesPage';

export type YearSearch = {
  /** The selected year; the current year when absent. */
  year?: number;
};

const validateYearSearch = (search: Record<string, unknown>): YearSearch => {
  const year = Number(search.year);
  return Number.isInteger(year) && year > 0 ? { year } : {};
};

const validateJournalSearch = (search: Record<string, unknown>): JournalSearch => ({
  ...(search.year === 'all' ? { year: 'all' as const } : validateYearSearch(search)),
  ...(isJournalType(search.type) ? { type: search.type } : {}),
  ...(typeof search.q === 'string' && search.q !== '' ? { q: search.q } : {}),
});

export type InsightsSearch = YearSearch & {
  /** `all` shows all-time insights; one year (`year`) when absent. */
  period?: 'all';
};

const validateInsightsSearch = (search: Record<string, unknown>): InsightsSearch =>
  search.period === 'all' ? { period: 'all' } : validateYearSearch(search);

/** The vehicle page opens on its Journal tab (specs/journal.md, UI notes). */
export const vehicleExpensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId',
  validateSearch: validateJournalSearch,
  component: VehicleExpensesPage,
});

/** Vehicle · Insights (specs/insights.md); Year (same year switcher as Journal) or All time. */
export const vehicleInsightsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/insights',
  validateSearch: (search: Record<string, unknown>) => validateInsightsSearch(search),
  component: InsightsPage,
});

/** Add to journal: Expense | Log (specs/journal.md). */
export const addExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/expenses/new',
  // Keeps the journal filters so Save and Cancel return to the same view (specs/journal-filters.md AC8).
  validateSearch: validateJournalSearch,
  component: AddJournalEntryPage,
});

export const editExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/expenses/$expenseId/edit',
  // Keeps the journal filters so Save and Cancel return to the same view (specs/journal-filters.md AC8).
  validateSearch: validateJournalSearch,
  component: EditExpensePage,
});

/** Edit log (specs/journal.md, UI notes). */
export const editLogEntryRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/log-entries/$logEntryId/edit',
  // Keeps the journal filters so Save and Cancel return to the same view (specs/journal-filters.md AC8).
  validateSearch: validateJournalSearch,
  component: EditLogEntryPage,
});

/** Vehicle · Planned (specs/planned-expenses.md). */
export const vehiclePlannedRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/planned',
  component: PlannedPage,
});

export const addPlannedExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/planned/new',
  component: AddPlannedExpensePage,
});

export const editPlannedExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/planned/$plannedExpenseId/edit',
  component: EditPlannedExpensePage,
});

export const payPlannedExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/planned/$plannedExpenseId/pay',
  component: PayPlannedExpensePage,
});
