import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ExpenseRequest, PlannedExpenseRequest } from '@/shared/api/generated/model';
import {
  anExpense,
  aPlannedExpense,
  aPlannedExpenseList,
  aUserProfile,
  aVehicle,
  eur,
  problem,
} from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const vehicle = aVehicle({ nickname: 'Golf' });

/** The local date `days` from today, as `YYYY-MM-DD`. */
const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** The local date `months` from today (same day of month, or the 1st to avoid month-end overflow). */
const inMonths = (months: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
};

const plannedHandlers = (list = aPlannedExpenseList()) => [
  http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
  http.get(api(`/vehicles/${vehicle.id}/planned-expenses`), () => HttpResponse.json(list)),
];

// specs/planned-expenses.md — acceptance criteria 1, 3, 4, 11 (UI side).
describe('PlannedPage', () => {
  it('shows the projection and the plans earliest first with their recurrence, amount and status', async () => {
    server.use(
      ...plannedHandlers(
        aPlannedExpenseList({
          projectionTotal: eur('310.00'),
          items: [
            aPlannedExpense({
              vehicleId: vehicle.id,
              category: 'SERVICE',
              note: null,
              dueDate: inDays(-20),
              recurrenceMonths: 6,
              displayAmount: eur('50.00'),
              dueSoon: true,
            }),
            aPlannedExpense({
              vehicleId: vehicle.id,
              category: 'REGISTRATION_TAX',
              note: null,
              dueDate: inDays(24),
              recurrenceMonths: null,
              displayAmount: eur('210.00'),
              dueSoon: true,
            }),
            aPlannedExpense({
              vehicleId: vehicle.id,
              dueDate: '2027-03-02',
              recurrenceMonths: 12,
              displayAmount: eur('320.00'),
              dueSoon: false,
            }),
          ],
        }),
      ),
    );

    renderApp(`/vehicles/${vehicle.id}/planned`);

    expect(await screen.findByText('≈ €310')).toBeInTheDocument();
    expect(screen.getByText('Projected · next 12 months')).toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Planned expenses' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Service');
    expect(items[0]).toHaveTextContent('every 6 months');
    expect(items[0]).toHaveTextContent('Overdue');
    expect(items[1]).toHaveTextContent('Registration & tax');
    expect(items[1]).toHaveTextContent('one-time');
    expect(items[1]).toHaveTextContent('Due in 24 days');
    expect(items[2]).toHaveTextContent('Insurance · renewal');
    expect(items[2]).toHaveTextContent('Mar 2, 2027 · repeats yearly');
    expect(items[2]).toHaveTextContent('€320');
    expect(screen.getByRole('link', { name: 'Mark Insurance · renewal as paid' })).toHaveAttribute(
      'href',
      expect.stringMatching(/\/planned\/.+\/pay$/),
    );
    expect(screen.getByRole('link', { name: 'Planned' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows "In N months" for a plan that is not due soon', async () => {
    server.use(
      ...plannedHandlers(
        aPlannedExpenseList({
          items: [aPlannedExpense({ vehicleId: vehicle.id, dueDate: inMonths(5), dueSoon: false })],
        }),
      ),
    );

    renderApp(`/vehicles/${vehicle.id}/planned`);

    // The 1st of the month 5 months ahead is 4 whole months away (or 5 on the 1st).
    expect(await screen.findByText(/^In [45] months$/)).toBeInTheDocument();
  });

  it('shows a zero projection and an empty state inviting to plan an expense', async () => {
    server.use(...plannedHandlers());

    renderApp(`/vehicles/${vehicle.id}/planned`);

    expect(await screen.findByText('Nothing planned yet')).toBeInTheDocument();
    expect(screen.getByText('≈ €0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan an expense' })).toHaveAttribute(
      'href',
      `/vehicles/${vehicle.id}/planned/new`,
    );
  });

  it('shows an error with retry when the plans cannot be loaded', async () => {
    let calls = 0;
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/planned-expenses`), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(problem(500, { title: 'Server error' }), { status: 500 })
          : HttpResponse.json(aPlannedExpenseList());
      }),
    );
    const user = userEvent.setup();

    renderApp(`/vehicles/${vehicle.id}/planned`);

    expect(await screen.findByText('Could not load the planned expenses')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Nothing planned yet')).toBeInTheDocument();
  });
});

// specs/planned-expenses.md — acceptance criteria 1, 2, 9 (UI side).
describe('Plan an expense / Edit plan', () => {
  it('plans an expense and returns to the Planned tab', async () => {
    let sent: PlannedExpenseRequest | undefined;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile({ displayCurrency: 'RSD' }))),
      http.post(api(`/vehicles/${vehicle.id}/planned-expenses`), async ({ request }) => {
        sent = (await request.json()) as PlannedExpenseRequest;
        return HttpResponse.json(aPlannedExpense({ vehicleId: vehicle.id }), { status: 201 });
      }),
      ...plannedHandlers(),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/planned/new`);

    expect(await screen.findByRole('combobox', { name: 'Currency' })).toHaveValue('RSD');
    await user.type(screen.getByLabelText('Estimated amount'), '320');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Currency' }), 'EUR');
    await user.click(screen.getByRole('button', { name: 'Insurance' }));
    await user.type(screen.getByLabelText('Due date'), '2027-03-02');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Repeats' }), 'Every year');
    await user.type(screen.getByLabelText('Note (optional)'), ' renewal ');
    await user.click(screen.getByRole('button', { name: 'Save plan' }));

    expect(await screen.findByText('Expense planned')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/planned`);
    expect(sent).toEqual({
      category: 'INSURANCE',
      estimatedAmount: { amount: '320', currency: 'EUR' },
      dueDate: '2027-03-02',
      recurrenceMonths: 12,
      note: 'renewal',
    });
  });

  it('validates required fields before sending', async () => {
    let posted = false;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/planned-expenses`), () => {
        posted = true;
        return HttpResponse.json(aPlannedExpense(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/planned/new`);

    await user.click(await screen.findByRole('button', { name: 'Save plan' }));

    expect(await screen.findByText('Amount is required')).toBeInTheDocument();
    expect(screen.getByText('Pick a category')).toBeInTheDocument();
    expect(screen.getByText('Due date is required')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Estimated amount'), '1.001');
    expect(
      await screen.findByText('Enter an amount of 0 or more with at most 2 decimals'),
    ).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('shows server field errors on the fields', async () => {
    server.use(
      http.get(api('/me'), () => HttpResponse.json(aUserProfile())),
      http.post(api(`/vehicles/${vehicle.id}/planned-expenses`), () =>
        HttpResponse.json(
          problem(400, {
            errors: [{ field: 'recurrenceMonths', message: 'must be greater than or equal to 1' }],
          }),
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/planned/new`);

    await user.type(await screen.findByLabelText('Estimated amount'), '10');
    await user.click(screen.getByRole('button', { name: 'Other' }));
    await user.type(screen.getByLabelText('Due date'), '2027-01-01');
    await user.click(screen.getByRole('button', { name: 'Save plan' }));

    expect(await screen.findByText('must be greater than or equal to 1')).toBeInTheDocument();
  });

  it('edits a plan pre-filled from the list, keeping an unusual recurrence selectable', async () => {
    const plan = aPlannedExpense({ vehicleId: vehicle.id, recurrenceMonths: 5 });
    let sent: PlannedExpenseRequest | undefined;
    server.use(
      ...plannedHandlers(aPlannedExpenseList({ items: [plan] })),
      http.put(api(`/planned-expenses/${plan.id}`), async ({ request }) => {
        sent = (await request.json()) as PlannedExpenseRequest;
        return HttpResponse.json(plan);
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/planned/${plan.id}/edit`);

    expect(await screen.findByRole('combobox', { name: 'Repeats' })).toHaveDisplayValue('every 5 months');
    expect(screen.getByLabelText('Estimated amount')).toHaveValue('320.00');
    await user.clear(screen.getByLabelText('Estimated amount'));
    await user.type(screen.getByLabelText('Estimated amount'), '300');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Repeats' }), 'Every 6 months');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/planned`);
    expect(sent).toMatchObject({ estimatedAmount: { amount: '300', currency: 'EUR' }, recurrenceMonths: 6 });
  });

  it('deletes a plan after confirmation', async () => {
    const plan = aPlannedExpense({ vehicleId: vehicle.id });
    let deleted = false;
    server.use(
      ...plannedHandlers(aPlannedExpenseList({ items: [plan] })),
      http.delete(api(`/planned-expenses/${plan.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/planned/${plan.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Delete plan' }));
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Planned expense deleted')).toBeInTheDocument();
    expect(deleted).toBe(true);
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/planned`);
  });
});

// specs/planned-expenses.md — acceptance criteria 5 and 8 (UI side).
describe('Mark as paid', () => {
  const plan = aPlannedExpense({
    vehicleId: vehicle.id,
    category: 'REPAIRS',
    estimatedAmount: eur('450.00'),
    dueDate: inDays(-3),
    recurrenceMonths: null,
    note: 'timing belt',
  });

  it('opens the expense form pre-filled from the plan with the category fixed, and pays it', async () => {
    let sent: ExpenseRequest | undefined;
    server.use(
      ...plannedHandlers(aPlannedExpenseList({ items: [plan] })),
      http.post(api(`/planned-expenses/${plan.id}/pay`), async ({ request }) => {
        sent = (await request.json()) as ExpenseRequest;
        return HttpResponse.json(anExpense({ vehicleId: vehicle.id }), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/planned/${plan.id}/pay`);

    expect(await screen.findByRole('heading', { name: 'Mark as paid' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Category')).toHaveValue('Repairs');
    expect(screen.queryByRole('button', { name: 'Fuel' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Date')).toHaveValue(plan.dueDate);
    expect(screen.getByLabelText('Note (optional)')).toHaveValue('timing belt');
    await user.clear(screen.getByLabelText('Amount'));
    await user.type(screen.getByLabelText('Amount'), '470');
    await user.click(screen.getByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('Expense recorded')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/planned`);
    expect(sent).toEqual({
      amount: { amount: '470', currency: 'EUR' },
      category: 'REPAIRS',
      date: plan.dueDate,
      odometer: null,
      note: 'timing belt',
    });
  });

  it('shows server field errors and stays on the form', async () => {
    server.use(
      ...plannedHandlers(aPlannedExpenseList({ items: [plan] })),
      http.post(api(`/planned-expenses/${plan.id}/pay`), () =>
        HttpResponse.json(
          problem(400, { errors: [{ field: 'date', message: 'must not be in the future' }] }),
          {
            status: 400,
          },
        ),
      ),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/planned/${plan.id}/pay`);

    await user.click(await screen.findByRole('button', { name: 'Save expense' }));

    expect(await screen.findByText('must not be in the future')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/planned/${plan.id}/pay`);
  });

  it('shows not found when the plan is no longer listed', async () => {
    server.use(...plannedHandlers());

    renderApp(`/vehicles/${vehicle.id}/planned/${plan.id}/pay`);

    expect(await screen.findByText('Planned expense not found')).toBeInTheDocument();
  });
});
