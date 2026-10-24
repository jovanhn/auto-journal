import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { API_URL } from './urls';

type Project = { id: string; name: string; description: string | null };
type Task = { id: string; projectId: string; title: string; status: 'OPEN' | 'DONE' };

/** Test data is created through the backend API, never by clicking through setup screens. */
export class Api {
  constructor(private readonly request: APIRequestContext) {}

  async createProject(name: string, description?: string): Promise<Project> {
    const res = await this.request.post(`${API_URL}/projects`, { data: { name, description } });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()) as Project;
  }

  async createTask(projectId: string, title: string): Promise<Task> {
    const res = await this.request.post(`${API_URL}/projects/${projectId}/tasks`, { data: { title } });
    expect(res.status(), await res.text()).toBe(201);
    return (await res.json()) as Task;
  }
}

type Fixtures = {
  api: Api;
  /** Unique, parallel-safe name: tests never depend on each other's data. */
  uniqueName: (prefix: string) => string;
};

export const test = base.extend<Fixtures>({
  api: async ({ request }, use) => {
    await use(new Api(request));
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
