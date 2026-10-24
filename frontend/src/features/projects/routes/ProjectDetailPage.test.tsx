import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { CreateTaskRequest, Task } from '@/shared/api/generated/model';
import { aProject, aTask, page, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

describe('ProjectDetailPage', () => {
  const project = aProject({ name: 'Garden', description: 'Veggies' });

  it('shows the project and its tasks', async () => {
    server.use(
      http.get(api(`/projects/${project.id}`), () => HttpResponse.json(project)),
      http.get(api(`/projects/${project.id}/tasks`), () =>
        HttpResponse.json(page([aTask({ title: 'Water plants' }), aTask({ title: 'Weed', status: 'DONE' })])),
      ),
    );

    renderApp(`/projects/${project.id}`);

    expect(await screen.findByRole('heading', { name: 'Garden' })).toBeInTheDocument();
    expect(screen.getByText('Veggies')).toBeInTheDocument();
    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Water plants')).toBeInTheDocument();
    expect(within(list).getByText('Weed')).toBeInTheDocument();
  });

  it('adds a task to the list', async () => {
    const tasks: Task[] = [];
    server.use(
      http.get(api(`/projects/${project.id}`), () => HttpResponse.json(project)),
      http.get(api(`/projects/${project.id}/tasks`), () => HttpResponse.json(page(tasks))),
      http.post(api(`/projects/${project.id}/tasks`), async ({ request }) => {
        const body = (await request.json()) as CreateTaskRequest;
        const task = aTask({ projectId: project.id, title: body.title });
        tasks.push(task);
        return HttpResponse.json(task, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp(`/projects/${project.id}`);
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Task title'), 'Water plants');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    const list = await screen.findByRole('list', { name: 'Tasks' });
    expect(within(list).getByText('Water plants')).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown project', async () => {
    server.use(
      http.get(api(`/projects/${project.id}`), () =>
        HttpResponse.json(problem(404, { title: 'Not Found' }), { status: 404 }),
      ),
      http.get(api(`/projects/${project.id}/tasks`), () =>
        HttpResponse.json(problem(404, { title: 'Not Found' }), { status: 404 }),
      ),
    );

    renderApp(`/projects/${project.id}`);

    expect(await screen.findByText('Project not found')).toBeInTheDocument();
  });
});
