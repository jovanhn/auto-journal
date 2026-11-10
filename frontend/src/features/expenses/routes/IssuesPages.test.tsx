import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { IssueRequest, ResolveIssueRequest } from '@/shared/api/generated/model';
import { anIssue, anIssueList, aVehicle, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const vehicle = aVehicle({ nickname: 'Golf' });
const thisYear = new Date().getFullYear();

/** The local date `days` from today, as `YYYY-MM-DD`. */
const inDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const listHandlers = (list = anIssueList()) => [
  http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
  http.get(api(`/vehicles/${vehicle.id}/issues`), () => HttpResponse.json(list)),
];

// specs/issues.md — acceptance criteria 1, 3, 5, 6, 10, 11 (UI side).
describe('IssuesPage', () => {
  it('lists open issues with their line and severity pill, and a collapsed Resolved section', async () => {
    server.use(
      ...listHandlers(
        anIssueList({
          open: [
            anIssue({
              vehicleId: vehicle.id,
              title: 'Check engine light (amber)',
              severity: 'URGENT',
              source: 'WARNING_LIGHT',
              noticedOn: `${thisYear}-10-18`,
              odometer: 184320,
            }),
            anIssue({ vehicleId: vehicle.id, noticedOn: `${thisYear}-10-12` }),
            anIssue({
              vehicleId: vehicle.id,
              title: 'Rattle',
              severity: 'WATCH',
              source: 'NOTICED',
              noticedOn: '2025-05-20',
              odometer: null,
            }),
          ],
          resolved: [
            anIssue({
              vehicleId: vehicle.id,
              title: 'AC smells musty',
              status: 'RESOLVED',
              outcome: 'FIXED',
              resolvedOn: '2025-08-02',
            }),
            anIssue({
              vehicleId: vehicle.id,
              title: 'Vibration at highway speed',
              status: 'RESOLVED',
              outcome: 'GONE',
              resolvedOn: '2025-01-09',
            }),
          ],
        }),
      ),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/issues`);

    expect(await screen.findByRole('heading', { name: 'Open · 3' })).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'Open issues' })).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Check engine light (amber)Warning light · Oct 18 · 184,320 kmUrgent',
      'Brake pads at ~30%Mechanic · Oct 12 · 184,200 kmFix soon',
      'RattleI noticed · May 20, 2025Watch',
    ]);
    expect(within(rows[0]!).getByRole('link').getAttribute('href')).toMatch(
      new RegExp(`^/vehicles/${vehicle.id}/issues/[^/]+/edit$`),
    );

    const toggle = screen.getByRole('button', { name: 'Resolved · 2' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('list', { name: 'Resolved issues' })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const resolved = within(screen.getByRole('list', { name: 'Resolved issues' })).getAllByRole('listitem');
    expect(resolved.map((row) => row.textContent)).toEqual([
      'AC smells mustyFixed · Aug 2, 2025',
      'Vibration at highway speedGone · Jan 9, 2025',
    ]);
    expect(screen.getByRole('navigation', { name: 'Vehicle sections' })).toHaveTextContent('Issues');
  });

  it('shows the empty state without any issues', async () => {
    server.use(...listHandlers());
    renderApp(`/vehicles/${vehicle.id}/issues`);

    expect(await screen.findByText('No open issues')).toBeInTheDocument();
    expect(
      screen.getByText('Note a warning light, a noise or something your mechanic said to keep an eye on.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add issue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Resolved/ })).not.toBeInTheDocument();
  });

  it('shows the only-resolved state with the collapsed Resolved section', async () => {
    server.use(
      ...listHandlers(
        anIssueList({
          resolved: [
            anIssue({
              vehicleId: vehicle.id,
              status: 'RESOLVED',
              outcome: 'FIXED',
              resolvedOn: '2025-08-02',
            }),
          ],
        }),
      ),
    );
    renderApp(`/vehicles/${vehicle.id}/issues`);

    expect(await screen.findByText('No open issues')).toBeInTheDocument();
    expect(screen.getByText('Nothing to keep an eye on right now.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resolved · 1' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows an error with retry when the issues cannot be loaded', async () => {
    server.use(
      http.get(api(`/vehicles/${vehicle.id}`), () => HttpResponse.json(vehicle)),
      http.get(api(`/vehicles/${vehicle.id}/issues`), () => HttpResponse.json(problem(500), { status: 500 })),
    );
    renderApp(`/vehicles/${vehicle.id}/issues`);

    expect(await screen.findByText('Could not load the issues')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

// specs/issues.md — acceptance criteria 1, 2, 12 (UI side).
describe('New issue', () => {
  it('adds an issue with the defaults Watch, I noticed and today', async () => {
    let sent: IssueRequest | undefined;
    server.use(
      ...listHandlers(),
      http.post(api(`/vehicles/${vehicle.id}/issues`), async ({ request }) => {
        sent = (await request.json()) as IssueRequest;
        return HttpResponse.json(anIssue(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/new`);

    expect(await screen.findByRole('button', { name: 'Watch' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'I noticed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('0 / 500')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), '  Brake pads at ~30%  ');
    await user.click(screen.getByRole('button', { name: 'Fix soon' }));
    await user.click(screen.getByRole('button', { name: 'Mechanic' }));
    await user.type(screen.getByLabelText('Odometer (optional)'), '184,200');
    await user.type(screen.getByLabelText('Note (optional)'), 'Replace soon');
    expect(screen.getByText('12 / 500')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save issue' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues`);
    });
    expect(sent).toEqual({
      title: 'Brake pads at ~30%',
      severity: 'FIX_SOON',
      source: 'MECHANIC',
      noticedOn: inDays(0),
      odometer: 184200,
      note: 'Replace soon',
    });
  });

  it('validates the title, the date and the odometer before sending', async () => {
    let posted = false;
    server.use(
      http.post(api(`/vehicles/${vehicle.id}/issues`), () => {
        posted = true;
        return HttpResponse.json(anIssue(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp(`/vehicles/${vehicle.id}/issues/new`);

    await user.type(await screen.findByLabelText('Title'), '   ');
    await user.clear(screen.getByLabelText('Date noticed'));
    await user.type(screen.getByLabelText('Date noticed'), inDays(1));
    await user.type(screen.getByLabelText('Odometer (optional)'), '-5');
    await user.click(screen.getByRole('button', { name: 'Save issue' }));

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Date cannot be in the future')).toBeInTheDocument();
    expect(screen.getByText('Odometer must be a whole number of 0 or more')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('shows server field errors on the fields and the limit message above the form', async () => {
    let calls = 0;
    server.use(
      http.post(api(`/vehicles/${vehicle.id}/issues`), () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json(
              problem(400, { errors: [{ field: 'odometer', message: 'must be at most 2000000' }] }),
              { status: 400 },
            )
          : HttpResponse.json(problem(409, { detail: 'A vehicle can have at most 200 issues.' }), {
              status: 409,
            });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/new`);

    await user.type(await screen.findByLabelText('Title'), 'Rattle');
    await user.type(screen.getByLabelText('Odometer (optional)'), '2000001');
    await user.click(screen.getByRole('button', { name: 'Save issue' }));
    expect(await screen.findByText('must be at most 2000000')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save issue' }));
    expect(await screen.findByText('A vehicle can have at most 200 issues.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues/new`);
  });
});

// specs/issues.md — acceptance criteria 5, 7, 8, 9 (UI side).
describe('Edit, resolve and reopen', () => {
  const issue = anIssue({ vehicleId: vehicle.id, noticedOn: inDays(-9) });

  it('edits an issue pre-filled from the server', async () => {
    let sent: IssueRequest | undefined;
    server.use(
      ...listHandlers(),
      http.get(api(`/issues/${issue.id}`), () => HttpResponse.json(issue)),
      http.put(api(`/issues/${issue.id}`), async ({ request }) => {
        sent = (await request.json()) as IssueRequest;
        return HttpResponse.json(issue);
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/${issue.id}/edit`);

    expect(await screen.findByLabelText('Title')).toHaveValue('Brake pads at ~30%');
    expect(screen.getByRole('button', { name: 'Fix soon' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Odometer (optional)')).toHaveValue('184200');
    await user.click(screen.getByRole('button', { name: 'Urgent' }));
    await user.clear(screen.getByLabelText('Note (optional)'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues`);
    });
    expect(sent).toMatchObject({ severity: 'URGENT', note: null, odometer: 184200 });
  });

  it('resolves an issue from the sheet with Fixed and today by default', async () => {
    let sent: ResolveIssueRequest | undefined;
    server.use(
      ...listHandlers(),
      http.get(api(`/issues/${issue.id}`), () => HttpResponse.json(issue)),
      http.post(api(`/issues/${issue.id}/resolve`), async ({ request }) => {
        sent = (await request.json()) as ResolveIssueRequest;
        return HttpResponse.json({ ...issue, status: 'RESOLVED', ...sent });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/${issue.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Resolve issue' }));
    const sheet = await screen.findByRole('dialog', { name: 'Resolve issue' });
    expect(within(sheet).getByRole('button', { name: 'Fixed' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(sheet).getByLabelText('Date resolved')).toHaveValue(inDays(0));

    await user.clear(within(sheet).getByLabelText('Date resolved'));
    await user.type(within(sheet).getByLabelText('Date resolved'), inDays(-10));
    await user.click(within(sheet).getByRole('button', { name: 'Resolve' }));
    expect(await within(sheet).findByText('Date cannot be before the date noticed')).toBeInTheDocument();

    await user.clear(within(sheet).getByLabelText('Date resolved'));
    await user.type(within(sheet).getByLabelText('Date resolved'), inDays(-1));
    await user.click(within(sheet).getByRole('button', { name: 'Gone · not an issue' }));
    await user.click(within(sheet).getByRole('button', { name: 'Resolve' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues`);
    });
    expect(sent).toEqual({ outcome: 'GONE', resolvedOn: inDays(-1) });
  });

  it('deletes an issue after confirmation', async () => {
    let deleted = false;
    server.use(
      ...listHandlers(),
      http.get(api(`/issues/${issue.id}`), () => HttpResponse.json(issue)),
      http.delete(api(`/issues/${issue.id}`), () => {
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/${issue.id}/edit`);

    await user.click(await screen.findByRole('button', { name: 'Delete issue' }));
    expect(deleted).toBe(false);
    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues`);
    });
    expect(deleted).toBe(true);
  });

  it('shows a resolved issue and reopens it', async () => {
    const resolved = anIssue({
      vehicleId: vehicle.id,
      noticedOn: '2025-02-20',
      odometer: 171050,
      status: 'RESOLVED',
      outcome: 'FIXED',
      resolvedOn: '2025-03-14',
    });
    let reopened = false;
    server.use(
      ...listHandlers(),
      http.get(api(`/issues/${resolved.id}`), () => HttpResponse.json(resolved)),
      http.post(api(`/issues/${resolved.id}/reopen`), () => {
        reopened = true;
        return HttpResponse.json({ ...resolved, status: 'OPEN', outcome: null, resolvedOn: null });
      }),
    );
    const user = userEvent.setup();
    const { router } = renderApp(`/vehicles/${vehicle.id}/issues/${resolved.id}`);

    expect(await screen.findByRole('heading', { name: 'Brake pads at ~30%' })).toBeInTheDocument();
    expect(screen.getByText('Fixed')).toBeInTheDocument();
    expect(screen.getByText('Resolved Mar 14, 2025')).toBeInTheDocument();
    expect(screen.getByText('Feb 20, 2025 · 171,050 km')).toBeInTheDocument();
    expect(screen.getByText('Replace within ~5,000 km')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reopen issue' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/vehicles/${vehicle.id}/issues`);
    });
    expect(reopened).toBe(true);
  });
});
