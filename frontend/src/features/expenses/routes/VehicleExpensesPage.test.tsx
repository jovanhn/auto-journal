import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Journal } from '@/shared/api/generated/model';
import { aJournal, aLogEntry, anExpense, aUserProfile, aVehicle, eur, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth();
const lastYear = currentYear - 1;
const thisJanuary = (day: number) => `${currentYear}-01-${String(day).padStart(2, '0')}`;

const vehicle = aVehicle({
  nickname: 'Golf',
  make: 'VW',
  model: 'Golf 7',
  currentOdometer: 184320,
  purchaseDate: '2023-05-10',
});

const handlers = (journal: Journal) => [
  http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
  http.get(api(`/vehicles/${vehicle.id}/journal`), () => HttpResponse.json(journal)),
  http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
];

const tile = (label: string) => screen.getByText(label).closest('div');
const money = (amount: number) =>
  `€${amount.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;

/** Fuel €50 and €40, Tires €380 and two log entries this January; Service €120 "Oil & filters" last October. */
const journal = aJournal({
  firstYear: lastYear,
  expenses: [
    anExpense({
      vehicleId: vehicle.id,
      date: thisJanuary(20),
      amount: eur('50.00'),
      displayAmount: eur('50.00'),
      note: 'Shell',
    }),
    anExpense({
      vehicleId: vehicle.id,
      date: thisJanuary(12),
      category: 'TIRES',
      note: 'Winter set',
      amount: eur('380.00'),
      displayAmount: eur('380.00'),
    }),
    anExpense({
      vehicleId: vehicle.id,
      date: thisJanuary(5),
      amount: eur('40.00'),
      displayAmount: eur('40.00'),
    }),
    anExpense({
      vehicleId: vehicle.id,
      date: `${lastYear}-10-03`,
      category: 'SERVICE',
      note: 'Oil & filters',
      amount: eur('120.00'),
      displayAmount: eur('120.00'),
      odometer: 183410,
    }),
  ],
  logEntries: [
    aLogEntry({ vehicleId: vehicle.id, date: thisJanuary(25), odometer: 185000, note: null }),
    aLogEntry({ vehicleId: vehicle.id, date: thisJanuary(8), odometer: null, note: 'Brake noise when cold' }),
  ],
});

const rowTitles = () =>
  screen
    .getAllByRole('listitem')
    .filter((item) => item.closest('ul')?.getAttribute('aria-label')?.endsWith('journal'))
    .map((item) => item.textContent);

// specs/journal-filters.md — acceptance criteria 2–9 (UI side); specs/journal.md UI notes.
describe('VehicleExpensesPage (journal)', () => {
  it('opens on the current year with year chips, tiles for what is shown and the Add journal entry FAB', async () => {
    server.use(...handlers(journal));
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByRole('heading', { name: 'Golf', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('VW Golf 7 · 2016 · 184,320 km')).toBeInTheDocument();
    const years = within(await screen.findByRole('group', { name: 'Year' })).getAllByRole('button');
    expect(years.map((chip) => chip.textContent)).toEqual(['All', String(currentYear), String(lastYear)]);
    expect(screen.getByRole('button', { name: String(currentYear) })).toHaveAttribute('aria-pressed', 'true');

    // AC5: Spent €470, Avg = 470 ÷ months elapsed this year (BR-I3), Entries 5.
    expect(tile('Spent')).toHaveTextContent('€470');
    expect(tile('Avg / month')).toHaveTextContent(money(Math.round((470 / (currentMonth + 1)) * 100) / 100));
    expect(tile('Entries')).toHaveTextContent('5');
    expect(screen.queryByText('Filtered results')).not.toBeInTheDocument();

    const january = screen.getByRole('region', { name: 'January' });
    expect(within(january).getByRole('heading')).toHaveTextContent('January€470.00');
    expect(rowTitles()).toEqual([
      'Log: Odometer readingJan 25 · 185,000 km',
      'Fuel · ShellJan 20 · 184,320 km€50.00',
      'Tires · Winter setJan 12 · 184,320 km€380.00',
      'Log: Brake noise when coldJan 8',
      'FuelJan 5 · 184,320 km€40.00',
    ]);
    expect(screen.getByRole('link', { name: 'Add journal entry' })).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/expenses/new`,
    );
  });

  it('switches to another year and to all years (AC2, AC6)', async () => {
    server.use(...handlers(journal));
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}`);

    await user.click(await screen.findByRole('button', { name: String(lastYear) }));
    expect(router.state.location.search).toEqual({ year: lastYear });
    expect(rowTitles()).toEqual([`Service · Oil & filtersOct 3, ${lastYear} · 183,410 km€120.00`]);
    expect(tile('Spent')).toHaveTextContent('€120');
    expect(tile('Avg / month')).toHaveTextContent('€10'); // ÷ 12 for a past year (BR-I3)
    expect(screen.getByText('Filtered results')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(router.state.location.search).toEqual({ year: 'all' });
    expect(screen.getByRole('region', { name: `January ${currentYear}` })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: `October ${lastYear}` })).toBeInTheDocument();
    expect(tile('Spent')).toHaveTextContent('€590');
    expect(tile('Entries')).toHaveTextContent('6');
    // From May 2023 (purchase date, earlier than the first expense) through this month (BR-I9).
    const months = (currentYear - 2023) * 12 + (currentMonth - 4) + 1;
    expect(tile('Avg / month')).toHaveTextContent(money(Math.round((590 / months) * 100) / 100));
  });

  it('shows only the chosen entry type or category (AC3)', async () => {
    server.use(...handlers(journal));
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}`);
    const type = await screen.findByRole('combobox', { name: 'Entry type' });

    await user.selectOptions(type, 'Fuel');
    expect(router.state.location.search).toEqual({ type: 'FUEL' });
    expect(rowTitles()).toEqual(['Fuel · ShellJan 20 · 184,320 km€50.00', 'FuelJan 5 · 184,320 km€40.00']);
    expect(tile('Spent')).toHaveTextContent('€90');
    expect(tile('Entries')).toHaveTextContent('2');

    await user.selectOptions(type, 'Log entries');
    expect(rowTitles()).toEqual([
      'Log: Odometer readingJan 25 · 185,000 km',
      'Log: Brake noise when coldJan 8',
    ]);
    expect(tile('Spent')).toHaveTextContent('€0');
    // A month showing only log entries has no total.
    expect(within(screen.getByRole('region', { name: 'January' })).getByRole('heading')).toHaveTextContent(
      /^January$/,
    );

    await user.selectOptions(type, 'Expenses');
    expect(tile('Entries')).toHaveTextContent('3');

    await user.selectOptions(type, 'All entries');
    expect(router.state.location.search).toEqual({});
    expect(tile('Entries')).toHaveTextContent('5');
  });

  it('searches titles ignoring case, and Clear filters restores the default (AC4, AC7)', async () => {
    server.use(...handlers(journal));
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}?year=all`);

    await user.type(await screen.findByRole('searchbox', { name: 'Search journal' }), 'OIL');
    expect(rowTitles()).toEqual([`Service · Oil & filtersOct 3, ${lastYear} · 183,410 km€120.00`]);
    expect(router.state.location.search).toEqual({ year: 'all', q: 'OIL' });

    await user.clear(screen.getByRole('searchbox', { name: 'Search journal' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search journal' }), 'odometer');
    expect(rowTitles()).toEqual(['Log: Odometer readingJan 25 · 185,000 km']);

    await user.type(screen.getByRole('searchbox', { name: 'Search journal' }), ' nothing');
    expect(screen.getByText('No entries match')).toBeInTheDocument();
    expect(screen.getByText('Try another search, year or entry type.')).toBeInTheDocument();
    expect(tile('Entries')).toHaveTextContent('0');

    await user.click(screen.getAllByRole('button', { name: 'Clear filters' })[0]!);
    expect(router.state.location.search).toEqual({});
    expect(screen.getByRole('searchbox', { name: 'Search journal' })).toHaveValue('');
    expect(screen.queryByText('Filtered results')).not.toBeInTheDocument();
    expect(tile('Entries')).toHaveTextContent('5');
  });

  it('keeps the filters in the links to an entry and to Add (AC8)', async () => {
    server.use(...handlers(journal));
    renderApp(`/vehicles/${vehicle.id}?year=all&type=SERVICE&q=oil`);

    expect(await screen.findByRole('combobox', { name: 'Entry type' })).toHaveValue('SERVICE');
    expect(screen.getByRole('searchbox', { name: 'Search journal' })).toHaveValue('oil');
    expect(screen.getByRole('link', { name: /Service · Oil & filters/ })).toHaveAttribute(
      'href',
      expect.stringMatching(
        new RegExp(`^/vehicles/${vehicle.id}/expenses/.+/edit\\?year=all&type=SERVICE&q=oil$`),
      ),
    );
    expect(screen.getByRole('link', { name: 'Add journal entry' })).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/expenses/new?year=all&type=SERVICE&q=oil`,
    );
  });

  it('shows an empty journal with zero tiles and an invitation to add an entry', async () => {
    server.use(...handlers(aJournal()));
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText(`No journal entries in ${currentYear}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add to journal' })).toBeInTheDocument();
    expect(tile('Spent')).toHaveTextContent('€0');
    expect(tile('Avg / month')).toHaveTextContent('€0');
    expect(tile('Entries')).toHaveTextContent('0');
    const years = within(screen.getByRole('group', { name: 'Year' })).getAllByRole('button');
    expect(years.map((chip) => chip.textContent)).toEqual(['All', String(currentYear)]);
  });

  it('shows the converted amount with the original one and sums display amounts', async () => {
    server.use(
      ...handlers(
        aJournal({
          expenses: [
            anExpense({
              vehicleId: vehicle.id,
              date: thisJanuary(2),
              amount: { amount: '1170.00', currency: 'RSD' },
              displayAmount: eur('10.00'),
            }),
            anExpense({
              vehicleId: vehicle.id,
              date: thisJanuary(1),
              amount: eur('10.00'),
              displayAmount: eur('10.00'),
            }),
          ],
        }),
      ),
    );

    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('1,170.00 RSD')).toBeInTheDocument();
    expect(tile('Spent')).toHaveTextContent('€20');
    expect(screen.getAllByText('€10.00')).toHaveLength(2);
  });

  // specs/approximate-expenses.md AC1, AC4: ≈ on the row only; totals unchanged.
  it('marks an approximate expense with ≈ and counts it in the totals', async () => {
    server.use(
      ...handlers(
        aJournal({
          expenses: [
            anExpense({
              vehicleId: vehicle.id,
              date: thisJanuary(1),
              category: 'TIRES',
              amount: eur('300.00'),
              displayAmount: eur('300.00'),
              approximate: true,
            }),
            anExpense({
              vehicleId: vehicle.id,
              date: thisJanuary(1),
              amount: eur('100.00'),
              displayAmount: eur('100.00'),
            }),
          ],
        }),
      ),
    );

    renderApp(`/vehicles/${vehicle.id}`);

    const approximateRow = await screen.findByRole('link', { name: /Tires/ });
    expect(approximateRow).toHaveTextContent('≈');
    expect(approximateRow).toHaveAccessibleName(/approximately\s*€300\.00/);
    const exactRow = screen.getByRole('link', { name: /Fuel/ });
    expect(exactRow).not.toHaveTextContent('≈');
    expect(tile('Spent')).toHaveTextContent('€400');
    expect(tile('Spent')).not.toHaveTextContent('≈');
  });

  it('shows an error with retry when the journal cannot be loaded', async () => {
    let fail = true;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}/journal`), () =>
        fail
          ? HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 })
          : HttpResponse.json(aJournal()),
      ),
      ...handlers(aJournal()),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('Could not load the journal')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText(`No journal entries in ${currentYear}`)).toBeInTheDocument();
  });

  it('shows an error state for a vehicle that does not exist', async () => {
    const id = '00000000-0000-4000-8000-00000000dead';
    server.use(
      http.get(api(`/vehicles/${id}`), () => HttpResponse.json(problem(404), { status: 404 })),
      http.get(api(`/vehicles/${id}/journal`), () => HttpResponse.json(problem(404), { status: 404 })),
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
    );

    renderApp(`/vehicles/${id}`);

    expect(await screen.findByText('Could not load the vehicle')).toBeInTheDocument();
  });

  // specs/metric-info.md AC1–2 for the journal tiles of specs/journal-filters.md.
  it('explains each tile', async () => {
    server.use(...handlers(aJournal()));
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}`);

    expect(await screen.findByText('Spent')).toBeInTheDocument();
    for (const label of ['Spent', 'Avg / month', 'Entries']) {
      expect(screen.getByRole('button', { name: `About ${label}` })).toBeInTheDocument();
    }
    await user.click(screen.getByRole('button', { name: 'About Spent' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent(
      'Sum of the expenses shown (period, type and search). Log entries never count.',
    );
  });
});
