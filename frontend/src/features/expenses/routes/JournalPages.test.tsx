import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ExpenseRequest, LogEntryRequest } from '@/shared/api/generated/model';
import { anExpense, aJournal, aLogEntry, aUserProfile, aVehicle, eur, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { todayIso } from '../schemas';
import { api, server } from '@/test/server';

const vehicle = aVehicle({ nickname: 'Golf' });

/** The journal the forms return to. */
const journalHandlers = () => [
  http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
  http.get(api(`/vehicles/${vehicle.id}/journal`), () => HttpResponse.json(aJournal())),
  http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
];

const expenseSwitch = () => screen.findByRole('switch', { name: 'This is an expense' });

// specs/journal.md — acceptance criteria 1, 2, 5 and the UI notes (journal list).
describe('Journal list', () => {
  it('shows expenses and log entries in one timeline, newest date then newest created first', async () => {
    const expense = anExpense({
      vehicleId: vehicle.id,
      date: '2025-10-18',
      createdAt: '2025-10-18T08:00:00Z',
      note: null,
      odometer: null,
    });
    const sameDayLog = aLogEntry({
      vehicleId: vehicle.id,
      date: '2025-10-18',
      createdAt: '2025-10-18T09:00:00Z',
      note: 'Brake noise when cold',
      odometer: null,
    });
    const newerLog = aLogEntry({ vehicleId: vehicle.id, date: '2025-10-20', odometer: 185000, note: null });
    const logOnly = aLogEntry({ vehicleId: vehicle.id, date: '2025-08-02', odometer: 183000, note: null });
    server.use(
      http.get(api(`/vehicles/${vehicle.id}/journal`), () =>
        HttpResponse.json(
          aJournal({
            firstYear: 2025,
            expenses: [expense],
            logEntries: [newerLog, sameDayLog, logOnly],
          }),
        ),
      ),
      ...journalHandlers(),
    );

    renderApp(`/vehicles/${vehicle.id}?year=2025`);

    const october = await screen.findByRole('region', { name: 'October' });
    expect(within(october).getByRole('heading')).toHaveTextContent('October€52.40');
    const rows = within(october).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Log: Odometer readingOct 20, 2025 · 185,000 km',
      'Log: Brake noise when coldOct 18, 2025',
      'FuelOct 18, 2025€52.40',
    ]);
    expect(within(rows[0]!).getByRole('link')).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/log-entries/${newerLog.id}/edit?year=2025`,
    );
    // A month with only log entries has no total in its header.
    const august = screen.getByRole('region', { name: 'August' });
    expect(within(august).getByRole('heading')).toHaveTextContent(/^August$/);
    expect(screen.getByRole('link', { name: 'Journal' })).toBeInTheDocument();
  });

  it('shows the empty journal text', async () => {
    server.use(...journalHandlers());
    renderApp(`/vehicles/${vehicle.id}`);
    expect(await screen.findByText(`No journal entries in ${new Date().getFullYear()}`)).toBeInTheDocument();
  });
});

// specs/journal.md — acceptance criteria 1–3 (UI side).
describe('Add to journal: Log', () => {
  it('adds a log entry with an odometer reading and returns to the journal', async () => {
    let sent: LogEntryRequest | undefined;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/log-entries`), async ({ request }) => {
        sent = (await request.json()) as LogEntryRequest;
        return HttpResponse.json(aLogEntry({ vehicleId: vehicle.id }), { status: 201 });
      }),
      ...journalHandlers(),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    const kind = await expenseSwitch();
    expect(kind).toHaveAttribute('aria-checked', 'true');
    await user.click(kind);
    expect(kind).toHaveAttribute('aria-checked', 'false');
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fuel' })).not.toBeInTheDocument();
    expect(screen.getByText('Add an odometer reading, a note, or both')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Odometer (km, optional)'), '185,000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Log added')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
    expect(sent).toEqual({ date: todayIso(), odometer: 185000, note: null });
  });

  it('asks for an odometer reading or a note before sending', async () => {
    let posted = false;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/log-entries`), () => {
        posted = true;
        return HttpResponse.json(aLogEntry(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    await user.click(await expenseSwitch());
    await user.type(screen.getByLabelText('Note (optional)'), '   ');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Add an odometer reading, a note, or both')).toBeInTheDocument();
    expect(screen.getByLabelText('Note (optional)')).toHaveAttribute('aria-invalid', 'true');
    expect(posted).toBe(false);
  });

  it('shows a server field error on its field', async () => {
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/log-entries`), () =>
        HttpResponse.json(
          problem(400, { errors: [{ field: 'odometer', message: 'must be at most 2000000' }] }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    await user.click(await expenseSwitch());
    await user.type(screen.getByLabelText('Odometer (km, optional)'), '3000000');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('must be at most 2000000')).toBeInTheDocument();
  });
});

// specs/journal.md — acceptance criteria 8 and 16 (UI side).
describe('Edit log', () => {
  const entry = aLogEntry({
    vehicleId: vehicle.id,
    date: '2025-10-20',
    odometer: 185000,
    note: 'New wipers',
  });
  const editUrl = `/vehicles/${vehicle.id}/log-entries/${entry.id}/edit`;
  const getEntry = () => http.get(api(`/log-entries/${entry.id}`), () => HttpResponse.json(entry));

  it('pre-fills the log and saves the changes', async () => {
    let sent: LogEntryRequest | undefined;
    server.use(
      getEntry(),
      ...journalHandlers(),
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.put(api(`/log-entries/${entry.id}`), async ({ request }) => {
        sent = (await request.json()) as LogEntryRequest;
        return HttpResponse.json({ ...entry, ...sent });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(editUrl);

    expect(await screen.findByRole('heading', { name: 'Edit log' })).toBeInTheDocument();
    const note = await screen.findByLabelText('Note (optional)');
    expect(note).toHaveValue('New wipers');
    expect(await expenseSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByLabelText('Odometer (km, optional)')).toHaveValue('185000');
    await user.clear(note);
    await user.type(note, 'Wipers replaced');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
    expect(sent).toEqual({ date: '2025-10-20', odometer: 185000, note: 'Wipers replaced' });
  });

  it('turns the log into an expense, keeping date, odometer and note', async () => {
    let sent: ExpenseRequest | undefined;
    server.use(
      getEntry(),
      http.get(api('/me'), () => HttpResponse.json(aUserProfile({ displayCurrency: 'RSD' }))),
      ...journalHandlers(),
      http.post(api(`/log-entries/${entry.id}/expense`), async ({ request }) => {
        sent = (await request.json()) as ExpenseRequest;
        return HttpResponse.json(anExpense({ id: entry.id, vehicleId: vehicle.id }));
      }),
    );
    const user = userEvent.setup();
    renderApp(editUrl);

    await user.click(await expenseSwitch());
    expect(screen.getByRole('combobox', { name: 'Currency' })).toHaveValue('RSD');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'EUR');
    await user.type(screen.getByLabelText('Amount'), '25.00');
    await user.click(screen.getByRole('button', { name: 'Other' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Saved as an expense')).toBeInTheDocument();
    expect(sent).toEqual({
      date: '2025-10-20',
      odometer: 185000,
      note: 'New wipers',
      amount: eur('25.00'),
      category: 'OTHER',
      approximate: false,
    });
  });

  it('deletes the log after confirmation', async () => {
    let deleted = false;
    server.use(
      getEntry(),
      ...journalHandlers(),
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.delete(api(`/log-entries/${entry.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(editUrl);

    await user.click(await screen.findByRole('button', { name: 'Delete log' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Delete this log entry?');
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Log deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
  });

  it('shows an error when the log cannot be loaded, e.g. an expense id (AC12)', async () => {
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.get(api(`/log-entries/${entry.id}`), () =>
        HttpResponse.json(problem(404, { title: 'Not Found', detail: 'Log entry not found' }), {
          status: 404,
        }),
      ),
    );
    renderApp(editUrl);
    expect(await screen.findByText('Could not load the log')).toBeInTheDocument();
  });
});

// specs/journal.md — acceptance criterion 17 (UI side).
describe('Edit expense: switch to Log', () => {
  const expense = anExpense({ vehicleId: vehicle.id, amount: eur('40.00'), odometer: 185200, note: 'Check' });

  it('asks before removing the cost; Cancel changes nothing, confirming converts', async () => {
    let sent: LogEntryRequest | undefined;
    server.use(
      ...journalHandlers(),
      http.get(api(`/expenses/${expense.id}`), () => HttpResponse.json(expense)),
      http.post(api(`/expenses/${expense.id}/log-entry`), async ({ request }) => {
        sent = (await request.json()) as LogEntryRequest;
        return HttpResponse.json(aLogEntry({ id: expense.id, vehicleId: vehicle.id }));
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/expenses/${expense.id}/edit`);

    await user.click(await expenseSwitch());
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Check');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    let dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Remove the cost from this entry?');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
    expect(sent).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Remove cost' }));

    expect(await screen.findByText('Saved as a log')).toBeInTheDocument();
    expect(sent).toEqual({ date: expense.date, odometer: 185200, note: 'Check' });
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
  });
});
