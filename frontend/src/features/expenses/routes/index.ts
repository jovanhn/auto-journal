import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '@/app/authenticatedRoute';
import { AddExpensePage } from './AddExpensePage';
import { EditExpensePage } from './EditExpensePage';
import { InsightsPage } from './InsightsPage';
import { VehicleExpensesPage } from './VehicleExpensesPage';

export type YearSearch = {
  /** The selected year; the current year when absent. */
  year?: number;
};

const validateYearSearch = (search: Record<string, unknown>): YearSearch => {
  const year = Number(search.year);
  return Number.isInteger(year) && year > 0 ? { year } : {};
};

/** The vehicle page opens on its Expenses tab (specs/expenses.md, UI notes). */
export const vehicleExpensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId',
  validateSearch: (search: Record<string, unknown>) => validateYearSearch(search),
  component: VehicleExpensesPage,
});

/** Vehicle · Insights (specs/insights.md); same year switcher as Expenses. */
export const vehicleInsightsRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/insights',
  validateSearch: (search: Record<string, unknown>) => validateYearSearch(search),
  component: InsightsPage,
});

export const addExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/expenses/new',
  component: AddExpensePage,
});

export const editExpenseRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/expenses/$expenseId/edit',
  component: EditExpensePage,
});
