import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { anExpenseSummary, aPlannedExpense, aVehicle, eur, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/vehicles.md — acceptance criteria 1, 5, 6 and 7; specs/expenses.md — AC 10;
// specs/planned-expenses.md — AC 10 (UI side).
describe('GaragePage', () => {
  // No plans unless a test says otherwise.
  beforeEach(() => {
    server.use(http.get(api('/planned-expenses/next-due'), () => HttpResponse.json([])));
  });

  it('shows the next planned expense on cards that have one, in the warning style when due soon', async () => {
    const golf = aVehicle({ nickname: 'Golf' });
    const octavia = aVehicle({ nickname: 'Octavia' });
    const clio = aVehicle({ nickname: 'Clio' });
    server.use(
      http.get(api('/vehicles'), () => HttpResponse.json([golf, octavia, clio])),
      http.get(api('/expenses/summary'), () => HttpResponse.json(anExpenseSummary())),
      http.get(api('/planned-expenses/next-due'), () =>
        HttpResponse.json([
          { vehicleId: golf.id, plannedExpense: aPlannedExpense({ vehicleId: golf.id }) },
          {
            vehicleId: clio.id,
            plannedExpense: aPlannedExpense({
              vehicleId: clio.id,
              category: 'REGISTRATION_TAX',
              dueDate: '2026-11-14',
              dueSoon: true,
            }),
          },
        ]),
      ),
    );

    renderApp('/');

    const items = within(await screen.findByRole('list', { name: 'Vehicles' })).getAllByRole('listitem');
    const golfLine = await within(items[0]!).findByText('Insurance · Mar 2, 2027');
    expect(golfLine.parentElement).toHaveClass('text-muted-foreground');
    expect(items[1]).not.toHaveTextContent('Next planned');
    expect(within(items[2]!).getByText('Registration & tax · Nov 14, 2026').parentElement).toHaveClass(
      'text-warning',
    );
  });

  it('lists the vehicles in the order returned, with make, model, year, odometer and value', async () => {
    server.use(
      http.get(api('/expenses/summary'), () => HttpResponse.json(anExpenseSummary())),
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
    server.use(
      http.get(api('/expenses/summary'), () => HttpResponse.json(anExpenseSummary())),
      http.get(api('/vehicles'), () => HttpResponse.json([])),
    );

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
      http.get(api('/expenses/summary'), () => HttpResponse.json(anExpenseSummary())),
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

  it('shows this year across all cars and each card total, 0 for a car without expenses', async () => {
    const golf = aVehicle({ nickname: 'Golf' });
    const clio = aVehicle({ nickname: 'Clio' });
    server.use(
      http.get(api('/vehicles'), () => HttpResponse.json([golf, clio])),
      http.get(api('/expenses/summary'), () =>
        HttpResponse.json(
          anExpenseSummary({
            year: 2026,
            total: eur('1200.00'),
            averagePerMonth: eur('120.00'),
            vehicles: [{ vehicleId: golf.id, total: eur('1200.00') }],
          }),
        ),
      ),
    );

    renderApp('/');

    const hero = await screen.findByRole('region', { name: 'All cars this year' });
    expect(hero).toHaveTextContent('All cars · 2026 so far');
    expect(hero).toHaveTextContent('€1,200');
    expect(hero).toHaveTextContent('2 vehicles · avg €120 / month');
    const items = within(screen.getByRole('list', { name: 'Vehicles' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('€1,200this year');
    expect(items[1]).toHaveTextContent('€0this year');
  });

  it('shows an error when the totals of this year cannot be loaded', async () => {
    server.use(
      http.get(api('/vehicles'), () => HttpResponse.json([aVehicle({ nickname: 'Golf' })])),
      http.get(api('/expenses/summary'), () =>
        HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 }),
      ),
    );

    renderApp('/');

    expect(await screen.findByText("Could not load this year's totals")).toBeInTheDocument();
    expect(screen.getByText('Golf')).toBeInTheDocument();
  });
});
