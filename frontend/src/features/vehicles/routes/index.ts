import { createRoute } from '@tanstack/react-router';
import { authenticatedRoute } from '@/app/authenticatedRoute';
import { AddVehiclePage } from './AddVehiclePage';
import { EditVehiclePage } from './EditVehiclePage';
import { GaragePage } from './GaragePage';
import { VehiclePage } from './VehiclePage';

/** The Garage is the home page. */
export const garageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: GaragePage,
});

export const addVehicleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/new',
  component: AddVehiclePage,
});

export const vehicleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId',
  component: VehiclePage,
});

export const editVehicleRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/vehicles/$vehicleId/edit',
  component: EditVehiclePage,
});
