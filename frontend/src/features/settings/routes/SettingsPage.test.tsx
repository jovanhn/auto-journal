import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import type { ServiceStatus, UpdateUserProfileRequest } from '@/shared/api/generated/model';
import { BUILD_INFO } from '@/shared/buildInfo';
import { aUserProfile, problem } from '@/test/fixtures';
import { fakeAuth, TEST_EMAIL } from '@/test/fakeSession';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

const aServiceStatus = (overrides: Partial<ServiceStatus> = {}): ServiceStatus => ({
  status: 'UP',
  component: 'backend',
  version: '1.4.7',
  gitSha: 'abcdef0123456789abcdef0123456789abcdef01',
  buildId: '987-2',
  buildTime: '2026-11-10T08:00:00Z',
  startedAt: '2026-11-12T09:00:00Z',
  ...overrides,
});

// specs/auth.md — acceptance criteria 5 and 11 (UI side).
describe('SettingsPage', () => {
  beforeEach(() => {
    server.use(http.get(api('/status'), () => HttpResponse.json(aServiceStatus())));
  });

  it('shows the current display currency and the signed-in email', async () => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile({ displayCurrency: 'RSD' }))));

    renderApp('/settings');

    expect(await screen.findByRole('combobox', { name: 'Display currency' })).toHaveValue('RSD');
    expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument();
  });

  it('changes the display currency', async () => {
    let profile = aUserProfile();
    let sent: UpdateUserProfileRequest | undefined;
    server.use(
      http.get(api('/me'), () => HttpResponse.json(profile)),
      http.patch(api('/me'), async ({ request }) => {
        sent = (await request.json()) as UpdateUserProfileRequest;
        profile = { ...profile, displayCurrency: sent.displayCurrency };
        return HttpResponse.json(profile);
      }),
    );
    const user = userEvent.setup();
    renderApp('/settings');

    const select = await screen.findByRole('combobox', { name: 'Display currency' });
    await user.selectOptions(select, 'USD');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Totals are now shown in USD')).toBeInTheDocument();
    expect(sent).toEqual({ displayCurrency: 'USD' });
    expect(select).toHaveValue('USD');
  });

  it('shows an error state when the profile cannot be loaded', async () => {
    server.use(
      http.get(api('/me'), () =>
        HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 }),
      ),
    );

    renderApp('/settings');

    expect(await screen.findByText('Could not load settings')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('signs out, drops cached server data and shows sign-in', async () => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile())));
    const user = userEvent.setup();
    const { router, queryClient } = renderApp('/settings');
    await screen.findByRole('combobox', { name: 'Display currency' });

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(fakeAuth.isSignedIn()).toBe(false);
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
  });
});

// specs/app-versioning.md — acceptance criteria 6–8 (Settings footer).
describe('SettingsPage build info', () => {
  beforeEach(() => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile())));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows the frontend and backend versions in the footer', async () => {
    server.use(http.get(api('/status'), () => HttpResponse.json(aServiceStatus())));

    renderApp('/settings');

    const footer = await screen.findByRole('contentinfo', { name: 'Build info' });
    expect(footer).toHaveTextContent(`Frontend ${BUILD_INFO.version} · ${BUILD_INFO.gitSha.slice(0, 7)}`);
    await waitFor(() => expect(footer).toHaveTextContent('Backend 1.4.7 · abcdef0 · Nov 10, 2026'));
  });

  it('shows "Checking…" while the backend status loads', async () => {
    server.use(http.get(api('/status'), () => delay('infinite')));

    renderApp('/settings');

    const footer = await screen.findByRole('contentinfo', { name: 'Build info' });
    expect(within(footer).getByText('Backend Checking…')).toBeInTheDocument();
    expect(footer).toHaveTextContent(`Frontend ${BUILD_INFO.version}`);
  });

  it('shows the backend as unavailable when the status fails', async () => {
    server.use(http.get(api('/status'), () => new HttpResponse(null, { status: 503 })));

    renderApp('/settings');

    expect(await screen.findByText('Backend Unavailable')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Build info' })).toHaveTextContent(
      `Frontend ${BUILD_INFO.version}`,
    );
  });

  it('shows the backend as unavailable when the status body is unexpected', async () => {
    server.use(http.get(api('/status'), () => HttpResponse.text('<html>Waking up</html>')));

    renderApp('/settings');

    expect(await screen.findByText('Backend Unavailable')).toBeInTheDocument();
  });

  it("copies both components' full build details", async () => {
    server.use(http.get(api('/status'), () => HttpResponse.json(aServiceStatus())));
    const user = userEvent.setup();
    renderApp('/settings');
    const footer = await screen.findByRole('contentinfo', { name: 'Build info' });
    await waitFor(() => expect(footer).toHaveTextContent('Backend 1.4.7'));

    await user.click(screen.getByRole('button', { name: 'Copy' }));

    expect(await screen.findByText('Copied')).toBeInTheDocument();
    const copied = await navigator.clipboard.readText();
    expect(copied).toContain(`frontend ${BUILD_INFO.version}`);
    expect(copied).toContain(`gitSha: ${BUILD_INFO.gitSha}`);
    expect(copied).toContain('backend 1.4.7');
    expect(copied).toContain('gitSha: abcdef0123456789abcdef0123456789abcdef01');
    expect(copied).toContain('buildId: 987-2');
    expect(copied).toContain('buildTime: 2026-11-10T08:00:00Z');
  });

  it('hides the footer and skips the status call when VITE_SHOW_BUILD_INFO is false', async () => {
    vi.stubEnv('VITE_SHOW_BUILD_INFO', 'false');
    let statusCalls = 0;
    server.use(
      http.get(api('/status'), () => {
        statusCalls += 1;
        return HttpResponse.json(aServiceStatus());
      }),
    );

    renderApp('/settings');

    await screen.findByRole('combobox', { name: 'Display currency' });
    expect(screen.queryByRole('contentinfo', { name: 'Build info' })).not.toBeInTheDocument();
    expect(statusCalls).toBe(0);
  });
});
