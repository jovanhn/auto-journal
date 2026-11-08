import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { aUserProfile } from '@/test/fixtures';
import { fakeAuth, fakeGoogle } from '@/test/fakeSession';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/auth.md — acceptance criteria 12–13 (Google sign-in callback).
describe('AuthCallbackPage', () => {
  beforeEach(() => {
    fakeAuth.signedOut();
  });

  it('completes Google sign-in and opens the page the user wanted', async () => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile())));
    const { router } = renderApp(`/auth/callback?code=${fakeGoogle.validCode}&redirect=%2Fsettings`);

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings');
    expect(fakeAuth.isSignedIn()).toBe(true);
  });

  it('opens the Garage when there is no redirect, and never leaves the app', async () => {
    server.use(http.get(api('/vehicles'), () => HttpResponse.json([])));
    const { router } = renderApp(
      `/auth/callback?code=${fakeGoogle.validCode}&redirect=${encodeURIComponent('//evil.example')}`,
    );

    expect(await screen.findByRole('heading', { name: 'Garage' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });

  it('shows an error when the user cancelled at Google', async () => {
    renderApp('/auth/callback?error=access_denied&error_description=User+cancelled');

    expect(await screen.findByText('Could not sign in with Google')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/sign-in');
    expect(fakeAuth.isSignedIn()).toBe(false);
  });

  it('shows an error for an invalid or already used code', async () => {
    renderApp('/auth/callback?code=used-code');

    expect(await screen.findByText('Could not sign in with Google')).toBeInTheDocument();
    expect(fakeAuth.isSignedIn()).toBe(false);
  });
});
