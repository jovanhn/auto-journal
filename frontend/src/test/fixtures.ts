import type {
  Expense,
  ExpenseSummary,
  ExpenseYear,
  Money,
  ProblemDetail,
  UserProfile,
  Vehicle,
  VehicleInsights,
} from '@/shared/api/generated/model';

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

export const eur = (amount: string): Money => ({ amount, currency: 'EUR' });

export const anExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: nextId(),
  vehicleId: '00000000-0000-4000-8000-0000000000aa',
  date: '2026-10-18',
  amount: eur('52.40'),
  displayAmount: eur('52.40'),
  category: 'FUEL',
  odometer: 184320,
  note: null,
  createdAt: '2026-10-18T10:00:00Z',
  ...overrides,
});

/** A year with no expenses unless overridden; month totals are all 0. */
export const anExpenseYear = (overrides: Partial<ExpenseYear> = {}): ExpenseYear => ({
  year: new Date().getFullYear(),
  firstYear: new Date().getFullYear(),
  yearTotal: eur('0.00'),
  monthTotals: Array.from({ length: 12 }, () => eur('0.00')),
  expenses: [],
  ...overrides,
});

/** Insights of a year without expenses unless overridden; lifetime figures of a car that has not been driven. */
export const aVehicleInsights = (overrides: Partial<VehicleInsights> = {}): VehicleInsights => ({
  year: new Date().getFullYear(),
  firstYear: new Date().getFullYear(),
  total: eur('0.00'),
  averagePerMonth: eur('0.00'),
  monthTotals: Array.from({ length: 12 }, () => eur('0.00')),
  categories: [],
  carValue: eur('8500.00'),
  distanceKm: 0,
  costPerKm: null,
  ...overrides,
});

export const anExpenseSummary = (overrides: Partial<ExpenseSummary> = {}): ExpenseSummary => ({
  year: new Date().getFullYear(),
  total: eur('0.00'),
  averagePerMonth: eur('0.00'),
  vehicles: [],
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
