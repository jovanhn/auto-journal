import { createRouter, type RouterHistory } from '@tanstack/react-router';
import { authCallbackRoute, oauthConsentRoute, signInRoute } from '@/features/auth/routes';
import {
  addExpenseRoute,
  addIssueRoute,
  addPlannedExpenseRoute,
  editExpenseRoute,
  editIssueRoute,
  editLogEntryRoute,
  editPlannedExpenseRoute,
  payPlannedExpenseRoute,
  resolvedIssueRoute,
  vehicleExpensesRoute,
  vehicleInsightsRoute,
  vehicleIssuesRoute,
  vehiclePlannedRoute,
} from '@/features/expenses/routes';
import { settingsRoute } from '@/features/settings/routes';
import { addVehicleRoute, editVehicleRoute, garageRoute } from '@/features/vehicles/routes';
import { authenticatedRoute } from './authenticatedRoute';
import { rootRoute } from './rootRoute';

/**
 * Code-based route tree: each feature exports its routes from `features/<feature>/routes`.
 * Everything except sign-in, the Google sign-in callback and the OAuth consent page lives under the authenticated layout route.
 */
export const routeTree = rootRoute.addChildren([
  signInRoute,
  authCallbackRoute,
  oauthConsentRoute,
  authenticatedRoute.addChildren([
    garageRoute,
    addVehicleRoute,
    vehicleExpensesRoute,
    vehicleInsightsRoute,
    vehiclePlannedRoute,
    editVehicleRoute,
    addExpenseRoute,
    editExpenseRoute,
    editLogEntryRoute,
    addPlannedExpenseRoute,
    editPlannedExpenseRoute,
    payPlannedExpenseRoute,
    vehicleIssuesRoute,
    addIssueRoute,
    editIssueRoute,
    resolvedIssueRoute,
    settingsRoute,
  ]),
]);

export const makeRouter = (history?: RouterHistory) =>
  createRouter({ routeTree, history, defaultPreload: 'intent', scrollRestoration: true });

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof makeRouter>;
  }
}
