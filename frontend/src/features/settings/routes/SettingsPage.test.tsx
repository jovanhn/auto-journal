import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { UpdateUserProfileRequest } from '@/shared/api/generated/model';
import { aUserProfile, problem } from '@/test/fixtures';
import { fakeAuth, TEST_EMAIL } from '@/test/fakeSession';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/auth.md — acceptance criteria 5 and 11 (UI side).
describe('SettingsPage', () => {
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
