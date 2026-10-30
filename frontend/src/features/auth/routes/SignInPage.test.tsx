import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { aUserProfile } from '@/test/fixtures';
import { fakeAuth, TEST_EMAIL, TEST_PASSWORD } from '@/test/fakeSession';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

// specs/auth.md — acceptance criteria 7–10.
describe('SignInPage', () => {
  beforeEach(() => {
    fakeAuth.signedOut();
  });

  it('has no sign-up link or page', async () => {
    renderApp('/sign-in');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sign up|register|create account/i })).not.toBeInTheDocument();
  });

  it('signs in and lands on the home page', async () => {
    server.use(http.get(api('/vehicles'), () => HttpResponse.json([])));
    const user = userEvent.setup();
    const { router } = renderApp('/sign-in');

    await user.type(await screen.findByLabelText('Email'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Garage' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(fakeAuth.isSignedIn()).toBe(true);
  });

  it('shows one generic error for wrong credentials and stays on sign-in', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/sign-in');

    await user.type(await screen.findByLabelText('Email'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email or password is incorrect')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
  });

  it('validates the fields before signing in', async () => {
    const user = userEvent.setup();
    renderApp('/sign-in');

    await user.click(await screen.findByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(fakeAuth.isSignedIn()).toBe(false);
  });

  it('redirects a signed-out user to sign-in and back to the page they opened', async () => {
    server.use(http.get(api('/me'), () => HttpResponse.json(aUserProfile())));
    const user = userEvent.setup();
    const { router } = renderApp('/settings');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');

    await user.type(screen.getByLabelText('Email'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/settings');
  });

  it('sends a signed-in user away from the sign-in page', async () => {
    fakeAuth.signedIn();
    server.use(http.get(api('/vehicles'), () => HttpResponse.json([])));
    const { router } = renderApp('/sign-in');

    expect(await screen.findByRole('heading', { name: 'Garage' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
  });
});
