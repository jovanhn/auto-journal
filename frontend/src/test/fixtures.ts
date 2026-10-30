import type { ProblemDetail, Project, ProjectSummary, Task, UserProfile } from '@/shared/api/generated/model';

let seq = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;

export const aProjectSummary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: nextId(),
  name: `Project ${seq}`,
  description: null,
  openTaskCount: 0,
  doneTaskCount: 0,
  ...overrides,
});

export const aProject = (overrides: Partial<Project> = {}): Project => ({
  id: nextId(),
  name: `Project ${seq}`,
  description: null,
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const aTask = (overrides: Partial<Task> = {}): Task => ({
  id: nextId(),
  projectId: nextId(),
  title: `Task ${seq}`,
  status: 'OPEN',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

export const aUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  userId: '00000000-0000-4000-8000-000000000001',
  displayCurrency: 'EUR',
  ...overrides,
});

export const page = <T>(items: T[], pageIndex = 0, size = 10) => ({
  items,
  page: pageIndex,
  size,
  totalItems: items.length,
});

export const problem = (status: number, overrides: Partial<ProblemDetail> = {}): ProblemDetail => ({
  type: 'about:blank',
  title: 'Error',
  status,
  ...overrides,
});
