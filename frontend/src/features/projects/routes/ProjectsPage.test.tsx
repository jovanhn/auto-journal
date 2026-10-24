import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { CreateProjectRequest, ProjectSummary } from '@/shared/api/generated/model';
import { aProject, aProjectSummary, page, problem } from '@/test/fixtures';
import { renderApp } from '@/test/renderApp';
import { api, server } from '@/test/server';

describe('ProjectsPage', () => {
  it('lists projects with their task counts', async () => {
    server.use(
      http.get(api('/projects'), () =>
        HttpResponse.json(page([aProjectSummary({ name: 'Garden', openTaskCount: 3, doneTaskCount: 1 })])),
      ),
    );

    renderApp('/');

    const table = await screen.findByRole('table', { name: 'Projects' });
    const row = within(table).getByRole('row', { name: /garden/i });
    expect(within(row).getByRole('link', { name: 'Garden' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '3' })).toBeInTheDocument();
    expect(within(row).getByRole('cell', { name: '1' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no projects', async () => {
    server.use(http.get(api('/projects'), () => HttpResponse.json(page([]))));

    renderApp('/');

    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('shows an error state when loading fails', async () => {
    server.use(
      http.get(api('/projects'), () =>
        HttpResponse.json(problem(500, { detail: 'Database unavailable' }), { status: 500 }),
      ),
    );

    renderApp('/');

    expect(await screen.findByText('Could not load projects')).toBeInTheDocument();
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
  });

  it('creates a project and shows it in the list', async () => {
    const projects: ProjectSummary[] = [];
    server.use(
      http.get(api('/projects'), () => HttpResponse.json(page(projects))),
      http.post(api('/projects'), async ({ request }) => {
        const body = (await request.json()) as CreateProjectRequest;
        const created = aProject({ name: body.name });
        projects.unshift(aProjectSummary({ id: created.id, name: created.name }));
        return HttpResponse.json(created, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp('/');
    await screen.findByText('No projects yet');

    await user.type(screen.getByLabelText('Name'), 'Garden');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByRole('link', { name: 'Garden' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });

  it('shows the server-side duplicate-name error on the name field', async () => {
    server.use(
      http.get(api('/projects'), () => HttpResponse.json(page([]))),
      http.post(api('/projects'), () =>
        HttpResponse.json(
          problem(409, {
            title: 'Conflict',
            detail: 'A project with this name already exists.',
            errors: [{ field: 'name', message: 'A project with this name already exists.' }],
          }),
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp('/');

    const name = await screen.findByLabelText('Name');
    await user.type(name, 'Garden');
    await user.click(screen.getByRole('button', { name: 'Create project' }));

    expect(await screen.findByText('A project with this name already exists.')).toBeInTheDocument();
    expect(name).toHaveAttribute('aria-invalid', 'true');
  });

  it('validates the name on blur before submitting', async () => {
    let posted = false;
    server.use(
      http.get(api('/projects'), () => HttpResponse.json(page([]))),
      http.post(api('/projects'), () => {
        posted = true;
        return HttpResponse.json(aProject(), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderApp('/');

    await user.click(await screen.findByLabelText('Name'));
    await user.tab();

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create project' }));
    expect(posted).toBe(false);
  });
});
