import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Money } from '@/shared/api/generated/model';
import { anExpense, anExpenseYear, aVehicle, eur, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();

const monthTotals = (totals: Record<number, string>): Money[] =>
  Array.from({ length: 12 }, (_, month) => eur(totals[month] ?? '0.00'));

// specs/expenses.md — acceptance criteria 1 and 3–6 (UI side).
describe('VehicleExpensesPage', () => {
  const vehicle = aVehicle({ nickname: 'Golf', make: 'VW', model: 'Golf 7', currentOdometer: 184320 });

  it('shows the app bar, the tiles and the year grouped by month, newest first', async () => {
    const year = anExpenseYear({
      year: 2025,
      firstYear: 2024,
      yearTotal: eur('436.10'),
      monthTotals: monthTotals({ 9: '52.40', 8: '386.00' }),
      expenses: [
        anExpense({ vehicleId: vehicle.id, date: '2025-10-18', odometer: 184320 }),
        anExpense({
          vehicleId: vehicle.id,
          date: '2025-09-27',
          category: 'PARKING_TOLLS',
          note: 'City centre',
          odometer: null,
          amount: eur('6.00'),
          displayAmount: eur('6.00'),
        }),
        anExpense({
          vehicleId: vehicle.id,
          date: '2025-09-04',
          category: 'TIRES',
          note: 'Winter set',
          amount: eur('380.00'),
          displayAmount: eur('380.00'),
          odometer: 182600,
        }),
      ],
    });
    let requestedYear: string | null = null;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), ({ request }) => {
        requestedYear = new URL(request.url).searchParams.get('year');
        return HttpResponse.json(year);
      }),
    );

    renderApp(`/vehicles/${vehicle.id}?year=2025`);

    expect(await screen.findByRole('heading', { name: 'Golf', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('VW Golf 7 · 2016 · 184,320 km')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit vehicle' })).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/edit`,
    );
    expect(await screen.findByText('Total 2025')).toBeInTheDocument();
    expect(screen.queryByText('This month')).not.toBeInTheDocument();
    expect(requestedYear).toBe('2025');

    const groups = screen
      .getAllByRole('region')
      .filter((group) => /^(October|September)$/.test(group.getAttribute('aria-label') ?? ''));
    expect(groups.map((group) => group.getAttribute('aria-label'))).toEqual(['October', 'September']);
    expect(within(groups[0]!).getByRole('heading')).toHaveTextContent('October€52.40');
    const september = within(groups[1]!).getAllByRole('listitem');
    expect(september[0]).toHaveTextContent('Parking & tolls · City centre');
    expect(september[0]).toHaveTextContent('Sep 27');
    expect(september[0]).toHaveTextContent('€6.00');
    expect(september[1]).toHaveTextContent('Tires · Winter set');
    expect(september[1]).toHaveTextContent('Sep 4 · 182,600 km');
    expect(within(groups[0]!).getByRole('link')).toHaveAttribute(
      'href',
      expect.stringMatching(new RegExp(`^/vehicles/${vehicle.id}/expenses/.+/edit$`)),
    );
    expect(screen.getByRole('link', { name: 'Add expense' })).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/expenses/new`,
    );
  });

  it('switches years within the first year and the current year', async () => {
    const years: string[] = [];
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), ({ request }) => {
        const year = Number(new URL(request.url).searchParams.get('year'));
        years.push(String(year));
        return HttpResponse.json(anExpenseYear({ year, firstYear: currentYear - 1 }));
      }),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('This year')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous year' }));

    expect(await screen.findByText(`Total ${currentYear - 1}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeEnabled();
    expect(years).toEqual([String(currentYear), String(currentYear - 1)]);
  });

  it('shows an empty year with zero tiles and an invitation to add an expense', async () => {
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), () => HttpResponse.json(anExpenseYear())),
    );

    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText(`No expenses in ${currentYear}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add an expense' })).toBeInTheDocument();
    expect(screen.getByText('This year').nextSibling).toHaveTextContent('€0');
    expect(screen.getByText('This month').nextSibling).toHaveTextContent('€0');
    expect(screen.getByRole('button', { name: 'Previous year' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next year' })).toBeDisabled();
  });

  it('shows the converted amount with the original one and the totals in the display currency', async () => {
    const rsd = anExpense({
      vehicleId: vehicle.id,
      date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      amount: { amount: '1170.00', currency: 'RSD' },
      displayAmount: eur('10.00'),
    });
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), () =>
        HttpResponse.json(
          anExpenseYear({
            yearTotal: eur('20.00'),
            monthTotals: monthTotals({ [currentMonth]: '20.00' }),
            expenses: [
              rsd,
              anExpense({
                vehicleId: vehicle.id,
                date: rsd.date,
                displayAmount: eur('10.00'),
                amount: eur('10.00'),
              }),
            ],
          }),
        ),
      ),
    );

    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('1,170.00 RSD')).toBeInTheDocument();
    expect(screen.getByText('This year').nextSibling).toHaveTextContent('€20');
    expect(screen.getByText('This month').nextSibling).toHaveTextContent('€20');
    expect(screen.getAllByText('€10.00')).toHaveLength(2);
  });

  it('shows an error with retry when the expenses cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/expenses`), () =>
        fail
          ? HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 })
          : HttpResponse.json(anExpenseYear()),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('Could not load the expenses')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(`No expenses in ${currentYear}`)).toBeInTheDocument();
  });

  it('shows an error state for a vehicle that does not exist', async () => {
    const id = '00000000-0000-4000-8000-00000000dead';
    server.use(
      http.get(api(`/vehicles/${id}`), () => HttpResponse.json(problem(404), { status: 404 })),
      http.get(api(`/vehicles/${id}/expenses`), () => HttpResponse.json(problem(404), { status: 404 })),
    );

    renderApp(`/vehicles/${id}`);

    expect(await screen.findByText('Could not load the vehicle')).toBeInTheDocument();
  });
});
