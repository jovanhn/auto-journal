import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { Expense, ExpenseRequest } from '@/shared/api/generated/model';
import {
  anExpense,
  anExpenseYear,
  aUserProfile,
  aVehicle,
  aVehicleInsights,
  eur,
  problem,
} from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const vehicle = aVehicle({ nickname: 'Golf' });

const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** The list page the forms return to. */
const listHandlers = () => [
  http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
  http.get(api(`/vehicles/${vehicle.id}/expenses`), () => HttpResponse.json(anExpenseYear())),
  http.get(api(`/vehicles/${vehicle.id}/insights`), () => HttpResponse.json(aVehicleInsights())),
];

// specs/expenses.md — acceptance criteria 1, 2, 7 and 8 (UI side).
describe('AddExpensePage', () => {
  it('defaults the currency to the display currency and the date to today', async () => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile({ displayCurrency: 'RSD' }))));

    renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    expect(await screen.findByRole('combobox', { name: 'Currency' })).toHaveValue('RSD');
    expect(screen.getByLabelText('Date')).toHaveValue(today());
    expect(screen.queryByLabelText('Vehicle')).not.toBeInTheDocument();
  });

  it('adds an expense to the vehicle and returns to its list', async () => {
    let sent: ExpenseRequest | undefined;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/expenses`), async ({ request }) => {
        sent = (await request.json()) as ExpenseRequest;
        return HttpResponse.json(anExpense({ vehicleId: vehicle.id }), { status: 201 });
      }),
      ...listHandlers(),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    await user.type(await screen.findByLabelText('Amount'), '52.40');
    await user.click(screen.getByRole('button', { name: 'Fuel' }));
    expect(screen.getByRole('button', { name: 'Fuel' })).toHaveAttribute('aria-pressed', 'true');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2026-01-18');
    await user.type(screen.getByLabelText('Odometer (km, optional)'), '184,320');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('Expense added')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
    expect(sent).toEqual({
      amount: { amount: '52.40', currency: 'EUR' },
      category: 'FUEL',
      date: '2026-01-18',
      odometer: 184320,
      note: null,
    });
  });

  it('validates required fields and limits before sending', async () => {
    let posted = false;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/expenses`), () => {
        posted = true;
        return HttpResponse.json(anExpense(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    await user.click(await screen.findByRole('button', { name: 'Save expense' }));
    expect(await screen.findByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Pick a category')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Amount'), '1.001');
    await user.type(screen.getByLabelText('Odometer (km, optional)'), '-5');
    await user.clear(screen.getByLabelText('Date'));
    await user.type(screen.getByLabelText('Date'), '2999-01-01');
    await user.click(screen.getByLabelText('Note (optional)'));
    await user.paste('x'.repeat(501));
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(
      await screen.findByText('Enter an amount of 0 or more with at most 2 decimals'),
    ).toBeInTheDocument();
    expect(screen.getByText('Odometer must be a whole number of 0 or more')).toBeInTheDocument();
    expect(screen.getByText('Date cannot be in the future')).toBeInTheDocument();
    expect(screen.getByText('Note must be at most 500 characters')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('shows a server field error on its field', async () => {
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/expenses`), () =>
        HttpResponse.json(
          problem(400, { errors: [{ field: 'date', message: 'must not be in the future' }] }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/expenses/new`);

    await user.type(await screen.findByLabelText('Amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Service' }));
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('must not be in the future')).toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('EditExpensePage', () => {
  const editUrl = (expense: Expense) => `/vehicles/${vehicle.id}/expenses/${expense.id}/edit`;

  it('pre-fills the form and saves the changes', async () => {
    const expense = anExpense({ vehicleId: vehicle.id, note: 'Shell', odometer: 184320 });
    let sent: ExpenseRequest | undefined;
    server.use(
      http.get(api(`/expenses/${expense.id}`), () => HttpResponse.json(expense)),
      http.put(api(`/expenses/${expense.id}`), async ({ request }) => {
        sent = (await request.json()) as ExpenseRequest;
        return HttpResponse.json({ ...expense, ...sent });
      }),
      ...listHandlers(),
    );
    const user = userEvent.setup();
    const { router } = renderApp(editUrl(expense));

    const amount = await screen.findByLabelText('Amount');
    expect(amount).toHaveValue('52.40');
    expect(screen.getByRole('button', { name: 'Fuel' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Odometer (km, optional)')).toHaveValue('184320');
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('Shell');
    await user.clear(amount);
    await user.type(amount, '60');
    await user.clear(screen.getByLabelText('Note (optional)'));
    await user.type(screen.getByLabelText('Note (optional)'), 'OMV');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
    expect(sent).toEqual({
      amount: eur('60'),
      category: 'FUEL',
      date: expense.date,
      odometer: 184320,
      note: 'OMV',
    });
  });

  it('deletes the expense after confirmation and returns to the list', async () => {
    const expense = anExpense({ vehicleId: vehicle.id });
    let deleted = false;
    server.use(
      http.get(api(`/expenses/${expense.id}`), () => HttpResponse.json(expense)),
      http.delete(api(`/expenses/${expense.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
      ...listHandlers(),
    );
    const user = userEvent.setup();
    const { router } = renderApp(editUrl(expense));

    await user.click(await screen.findByRole('button', { name: 'Delete expense' }));
    expect(await screen.findByRole('alertdialog', { name: 'Delete this expense?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Expense deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}`);
  });

  it('deletes nothing when the confirmation is cancelled', async () => {
    const expense = anExpense({ vehicleId: vehicle.id });
    let deleted = false;
    server.use(
      http.get(api(`/expenses/${expense.id}`), () => HttpResponse.json(expense)),
      http.delete(api(`/expenses/${expense.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(editUrl(expense));

    await user.click(await screen.findByRole('button', { name: 'Delete expense' }));
    await user.click(await screen.findByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(deleted).toBe(false);
    expect(router.state.location.pathname).toBe(editUrl(expense));
  });

  it('shows an error state for an expense that does not exist', async () => {
    const expense = anExpense({ vehicleId: vehicle.id });
    server.use(
      http.get(api(`/expenses/${expense.id}`), () => HttpResponse.json(problem(404), { status: 404 })),
    );

    renderApp(editUrl(expense));

    expect(await screen.findByText('Could not load the expense')).toBeInTheDocument();
  });
});
