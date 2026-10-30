import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { aVehicle, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/vehicles.md — acceptance criteria 1, 5, 6 and 7 (UI side).
describe('GaragePage', () => {
  it('lists the vehicles in the order returned, with make, model, year, odometer and value', async () => {
    server.use(
      http.get(api('/vehicles'), () =>
        HttpResponse.json([
          aVehicle({ nickname: 'Golf' }),
          aVehicle({
            nickname: 'Octavia',
            make: 'Škoda',
            model: 'Octavia',
            year: 2019,
            currentOdometer: 96480,
            value: { amount: '8547.01', currency: 'EUR' },
          }),
        ]),
      ),
    );

    renderApp('/');

    const items = within(await screen.findByRole('list', { name: 'Vehicles' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Golf');
    expect(items[0]).toHaveTextContent('VW Golf 7 · 2016 · 184,320 km');
    expect(items[0]).toHaveTextContent('Value €8,500');
    expect(items[1]).toHaveTextContent('Škoda Octavia · 2019 · 96,480 km');
    expect(items[1]).toHaveTextContent('Value €8,547.01');
    expect(screen.getByRole('link', { name: /^Golf/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/vehicles\//),
    );
    expect(screen.getByRole('link', { name: 'Add vehicle' })).toHaveAttribute('href', '/vehicles/new');
  });

  it('shows an empty state inviting to add the first vehicle', async () => {
    server.use(http.get(api('/vehicles'), () => HttpResponse.json([])));

    renderApp('/');

    expect(await screen.findByText('No vehicles yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add your first vehicle' })).toHaveAttribute(
      'href',
      '/vehicles/new',
    );
  });

  it('shows an error with retry when the list cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get(api('/vehicles'), () =>
        fail
          ? HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 })
          : HttpResponse.json([aVehicle({ nickname: 'Golf' })]),
      ),
    );
    const user = userEvent.setup();
    renderApp('/');

    expect(await screen.findByText('Could not load your vehicles')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();

    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Golf')).toBeInTheDocument();
  });
});
