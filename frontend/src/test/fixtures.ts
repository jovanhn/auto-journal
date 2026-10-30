import type { ProblemDetail, UserProfile, Vehicle } from '@/shared/api/generated/model';

let seq = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

export const aVehicle = (overrides: Partial<Vehicle> = {}): Vehicle => ({
  id: nextId(),
  nickname: `Car ${seq}`,
  make: 'VW',
  model: 'Golf 7',
  year: 2016,
  plate: null,
  odometerAtStart: 184320,
  currentOdometer: 184320,
  purchasePrice: { amount: '8500.00', currency: 'EUR' },
  value: { amount: '8500.00', currency: 'EUR' },
  purchaseDate: '2023-05-10',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const aUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  userId: '00000000-0000-4000-8000-000000000001',
  displayCurrency: 'EUR',
  ...overrides,
});

export const problem = (status: number, overrides: Partial<ProblemDetail> = {}): ProblemDetail => ({
  type: 'about:blank',
  title: 'Error',
  status,
  ...overrides,
});
