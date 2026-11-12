import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { redirectTo } from '@/shared/lib/browser';
import { fakeAuth, fakeOAuth, TEST_EMAIL, TEST_PASSWORD } from '@/test/fakeSession';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

vi.mock('@/shared/lib/browser', () => ({ redirectTo: vi.fn() }));

const consentUrl = (id = fakeOAuth.authorizationId) => `/oauth/consent?authorization_id=${id}`;

// specs/assistant-mcp.md — acceptance criteria 5 and 6.
describe('OAuthConsentPage', () => {
  beforeEach(() => {
    vi.mocked(redirectTo).mockClear();
  });

  it('shows the client, the signed-in email and what access it gets', async () => {
    renderApp(consentUrl());

    expect(
      await screen.findByRole('heading', { name: 'Claude wants to access your autojournal' }),
    ).toBeInTheDocument();
    expect(screen.getByText(TEST_EMAIL)).toBeInTheDocument();
    expect(screen.getByText(/full access to your autojournal data/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Deny' })).toBeEnabled();
  });

  it('approves and sends the user back to Claude', async () => {
    const user = userEvent.setup();
    renderApp(consentUrl());

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(fakeOAuth.decisions).toEqual([{ authorizationId: fakeOAuth.authorizationId, approve: true }]);
    expect(redirectTo).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=abc');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  it('denies and sends the user back to Claude without access', async () => {
    const user = userEvent.setup();
    renderApp(consentUrl());

    await user.click(await screen.findByRole('button', { name: 'Deny' }));

    expect(fakeOAuth.decisions).toEqual([{ authorizationId: fakeOAuth.authorizationId, approve: false }]);
    expect(redirectTo).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?error=access_denied');
  });

  it('goes straight back when the client was already approved', async () => {
    fakeOAuth.request = {
      kind: 'redirect',
      redirectUrl: 'https://claude.ai/api/mcp/auth_callback?code=again',
    };
    renderApp(consentUrl());

    expect(await screen.findByRole('status')).toHaveTextContent('Loading the authorization request…');
    await vi.waitFor(() => {
      expect(redirectTo).toHaveBeenCalledWith('https://claude.ai/api/mcp/auth_callback?code=again');
    });
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it.each([
    ['an expired or invalid', consentUrl('unknown')],
    ['a missing', '/oauth/consent'],
  ])('shows an error with a link to the app for %s authorization id', async (_, url) => {
    renderApp(url);

    expect(
      await screen.findByText('This authorization request is invalid or has expired'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to autojournal' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(fakeOAuth.decisions).toEqual([]);
  });

  it('shows an error when the decision cannot be saved', async () => {
    fakeOAuth.failDecision = true;
    const user = userEvent.setup();
    renderApp(consentUrl());

    await user.click(await screen.findByRole('button', { name: 'Approve' }));

    expect(
      await screen.findByText('Could not save your decision. Start again from the app.'),
    ).toBeInTheDocument();
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it('asks a signed-out user to sign in first and comes back to the consent page', async () => {
    fakeAuth.signedOut();
    server.use(http.get(api('/vehicles'), () => HttpResponse.json([])));
    const user = userEvent.setup();
    const { router } = renderApp(consentUrl());

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), TEST_EMAIL);
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByRole('heading', { name: 'Claude wants to access your autojournal' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/oauth/consent');
  });
});
