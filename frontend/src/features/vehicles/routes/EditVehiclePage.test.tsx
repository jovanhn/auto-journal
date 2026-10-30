import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { UpdateVehicleRequest, Vehicle } from '@/shared/api/generated/model';
import { anExpenseSummary, anExpenseYear, aVehicle, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/vehicles.md — acceptance criteria 7–9 (UI side). Edit and Delete open from the vehicle's app bar
// (specs/expenses.md, UI notes).
describe('EditVehiclePage', () => {
  it('pre-fills the form, saves the changes and shows them in the vehicle app bar', async () => {
    let vehicle: Vehicle = aVehicle({ nickname: 'Golf', plate: null });
    let sent: UpdateVehicleRequest | undefined;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), () => HttpResponse.json(anExpenseYear())),
      http.put(api(`/vehicles/${vehicle.id}`), async ({ request }) => {
        sent = (await request.json()) as UpdateVehicleRequest;
        vehicle = { ...vehicle, ...sent, plate: sent.plate ?? null };
        return HttpResponse.json(vehicle);
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/edit`);

    const model = await screen.findByLabelText('Model');
    expect(screen.getByLabelText('Nickname')).toHaveValue('Golf');
    expect(screen.getByLabelText('Price paid')).toHaveValue('8500.00');
    await user.clear(model);
    await user.type(model, 'Golf 7 GTD');
    await user.type(screen.getByLabelText('Plate (optional)'), 'BG-123-AB');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
    expect(await screen.findByText(/VW Golf 7 GTD/)).toBeInTheDocument();
    expect(sent).toMatchObject({ model: 'Golf 7 GTD', plate: 'BG-123-AB', odometerAtStart: 184320 });
  });

  it('shows an error state for a vehicle that does not exist', async () => {
    const id = '00000000-0000-4000-8000-00000000dead';
    server.use(
      http.get(api(`/vehicles/${id}`), () =>
        HttpResponse.json(problem(404, { detail: `Vehicle ${id} not found` }), { status: 404 }),
      ),
    );

    renderApp(`/vehicles/${id}/edit`);

    expect(await screen.findByText('Could not load the vehicle')).toBeInTheDocument();
  });

  it('deletes the vehicle after confirmation and returns to the Garage', async () => {
    const vehicle = aVehicle({ nickname: 'Golf' });
    let deleted = false;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api('/vehicles'), () => HttpResponse.json([])),
      http.get(api('/expenses/summary'), () => HttpResponse.json(anExpenseSummary())),
      http.delete(api(`/vehicles/${vehicle.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Delete vehicle' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete Golf?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete vehicle' }));

    expect(await screen.findByText('Golf deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(router.state.location.pathname).toBe('/');
  });

  it('deletes nothing when the confirmation is cancelled', async () => {
    const vehicle = aVehicle({ nickname: 'Golf' });
    let deleted = false;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.delete(api(`/vehicles/${vehicle.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Delete vehicle' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleted).toBe(false);
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/edit`);
  });
});
