import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '@/app/authenticatedRoute';
import { AddExpensePage } from './AddExpensePage';
import { EditExpensePage } from './EditExpensePage';
import { VehicleExpensesPage } from './VehicleExpensesPage';

export type VehicleExpensesSearch = {
  /** The selected year; the current year when absent. */
  year?: number;
};

/** The vehicle page opens on its Expenses tab (specs/expenses.md, UI notes). */
export const vehicleExpensesRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId',
  validateSearch: (search: Record<string, unknown>): VehicleExpensesSearch => {
    const year = Number(search.year);
    return Number.isInteger(year) && year > 0 ? { year } : {};
  },
  component: VehicleExpensesPage,
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
