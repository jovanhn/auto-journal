import { test as base, expect, request as requestFactory, type APIRequestContext } from '@playwright/test';
import { e2eUser, supabase } from './env';
import { API_URL } from './urls';

type Currency = 'EUR' | 'RSD' | 'USD';
type Vehicle = { id: string; nickname: string; make: string; model: string; year: number };

/** Test data is created through the backend API, never by clicking through setup screens. */
export class Api {
  constructor(private readonly request: APIRequestContext) {}

  /** Adds a vehicle for the E2E user; unspecified fields get valid defaults. */
  async createVehicle(nickname: string, overrides: Record<string, unknown> = {}): Promise<Vehicle> {
    const res = await this.request.post(`${API_URL}/vehicles`, {
      data: {
        nickname,
        make: 'VW',
        model: 'Golf 7',
        year: 2016,
        odometerAtStart: 184320,
        purchasePrice: { amount: '8500', currency: 'EUR' satisfies Currency },
        purchaseDate: '2023-05-10',
        ...overrides,
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()) as Vehicle;
  }
}

/** Signs the E2E user in with Supabase Auth's password grant and returns the access token. */
async function signInForToken(request: APIRequestContext): Promise<string> {
  const { url, publishableKey } = supabase();
  const res = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: publishableKey },
    data: e2eUser(),
  });
  expect(res.status(), await res.text()).toBe(200);
  return ((await res.json()) as { access_token: string }).access_token;
}

type Fixtures = {
  api: Api;
  /** Unique, parallel-safe name: tests never depend on each other's data. */
  uniqueName: (prefix: string) => string;
};

type WorkerFixtures = {
  /** Supabase access token of the E2E user, fetched once per worker. */
  accessToken: string;
};

export const test = base.extend<Fixtures, WorkerFixtures>({
  accessToken: [
    async ({}, use) => {
      const request = await requestFactory.newContext();
      await use(await signInForToken(request));
      await request.dispose();
    },
    { scope: 'worker' },
  ],
  api: async ({ accessToken }, use) => {
    const request = await requestFactory.newContext({
      extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
    });
    await use(new Api(request));
    await request.dispose();
  },
  uniqueName: async ({}, use, testInfo) => {
    let n = 0;
    await use(
      (prefix) =>
        `${prefix} ${testInfo.workerIndex}-${Date.now().toString(36)}-${(n++).toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    );
  },
});

export { expect };
