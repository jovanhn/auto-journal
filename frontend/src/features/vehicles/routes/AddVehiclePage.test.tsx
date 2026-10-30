import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { CreateVehicleRequest } from '@/shared/api/generated/model';
import { aUserProfile, aVehicle, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

type User = ReturnType<typeof userEvent.setup>;

async function fillGolf(user: User) {
  await user.type(await screen.findByLabelText('Nickname'), 'Golf');
  await user.type(screen.getByLabelText('Make'), 'VW');
  await user.type(screen.getByLabelText('Model'), 'Golf 7');
  await user.type(screen.getByLabelText('Year'), '2016');
  await user.type(screen.getByLabelText('Current odometer (km)'), '184,320');
  await user.type(screen.getByLabelText('Price paid'), '8,500');
  await user.type(screen.getByLabelText('Date bought'), '2023-05-10');
}

// specs/vehicles.md — acceptance criteria 1–3 (UI side).
describe('AddVehiclePage', () => {
  beforeEach(() => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile({ displayCurrency: 'RSD' }))));
  });

  it('defaults the price currency to the display currency', async () => {
    renderApp('/vehicles/new');

    expect(await screen.findByRole('combobox', { name: 'Currency' })).toHaveValue('RSD');
  });

  it('adds a vehicle and returns to the Garage', async () => {
    let sent: CreateVehicleRequest | undefined;
    const vehicles = [] as ReturnType<typeof aVehicle>[];
    server.use(
      http.get(api('/vehicles'), () => HttpResponse.json(vehicles)),
      http.post(api('/vehicles'), async ({ request }) => {
        sent = (await request.json()) as CreateVehicleRequest;
        const vehicle = aVehicle({ nickname: sent.nickname });
        vehicles.push(vehicle);
        return HttpResponse.json(vehicle, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp('/vehicles/new');

    await fillGolf(user);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'EUR');
    await user.click(screen.getByRole('button', { name: 'Add to garage' }));

    expect(await screen.findByText('Golf added to your garage')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('heading', { name: 'Garage' })).toBeInTheDocument();
    expect(sent).toEqual({
      nickname: 'Golf',
      make: 'VW',
      model: 'Golf 7',
      year: 2016,
      plate: null,
      odometerAtStart: 184320,
      purchasePrice: { amount: '8500', currency: 'EUR' },
      purchaseDate: '2023-05-10',
    });
  });

  it('validates required fields and limits before sending', async () => {
    let posted = false;
    server.use(
      http.post(api('/vehicles'), () => {
        posted = true;
        return HttpResponse.json(aVehicle(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp('/vehicles/new');

    await user.type(await screen.findByLabelText('Year'), '1899');
    await user.type(screen.getByLabelText('Price paid'), '1.001');
    await user.click(screen.getByRole('button', { name: 'Add to garage' }));

    expect(await screen.findByText('Nickname is required')).toBeInTheDocument();
    expect(screen.getByText('Make is required')).toBeInTheDocument();
    expect(screen.getByText('Model is required')).toBeInTheDocument();
    expect(screen.getByText('Year must be 1900 or later')).toBeInTheDocument();
    expect(screen.getByText('Odometer is required')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount of 0 or more with at most 2 decimals')).toBeInTheDocument();
    expect(screen.getByText('Date bought is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Nickname')).toHaveAttribute('aria-invalid', 'true');
    expect(posted).toBe(false);
  });

  it('shows the duplicate-nickname error from the server on the nickname field', async () => {
    server.use(
      http.post(api('/vehicles'), () =>
        HttpResponse.json(
          problem(409, {
            detail: 'You already have a vehicle with this nickname.',
            errors: [{ field: 'nickname', message: 'You already have a vehicle with this nickname.' }],
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp('/vehicles/new');

    await fillGolf(user);
    await user.click(screen.getByRole('button', { name: 'Add to garage' }));

    expect(await screen.findByText('You already have a vehicle with this nickname.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nickname')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows a nested server field error on the price field', async () => {
    server.use(
      http.post(api('/vehicles'), () =>
        HttpResponse.json(
          problem(400, { errors: [{ field: 'purchasePrice.amount', message: 'must match the pattern' }] }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp('/vehicles/new');

    await fillGolf(user);
    await user.click(screen.getByRole('button', { name: 'Add to garage' }));

    expect(await screen.findByText('must match the pattern')).toBeInTheDocument();
    expect(screen.getByLabelText('Price paid')).toHaveAttribute('aria-invalid', 'true');
  });
});
