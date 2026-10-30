import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Pagination } from '@/shared/ui/Pagination';
import { CreateProjectForm } from '../components/CreateProjectForm';
import { ProjectsTable } from '../components/ProjectsTable';
import { useCreateProject } from '../hooks/useCreateProject';
import { useProjectSummaries } from '../hooks/useProjectSummaries';
import type { CreateProjectFormValues } from '../schemas';

const route = getRouteApi('/_app/');

export function ProjectsPage() {
  const { page, size } = route.useSearch();
  const navigate = route.useNavigate();
  const summaries = useProjectSummaries(page, size);
  const createProject = useCreateProject();

  const handleCreate = async (values: CreateProjectFormValues) => {
    const project = await createProject.mutateAsync({
      data: { name: values.name, description: values.description?.trim() || null },
    });
    toast.success(`Project “${project.name}” created`);
    // New projects are listed first; show page 1 so the user sees it.
    await navigate({ search: { page: 0, size } });
  };

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold">Projects</h1>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>New project</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CreateProjectForm onSubmit={handleCreate} />
        </CardContent>
      </Card>

      <section aria-labelledby="project-list-heading" className="flex flex-col gap-4">
        <h2 id="project-list-heading" className="text-lg font-medium">
          All projects
        </h2>
        {summaries.isPending ? (
          <LoadingState label="Loading projects…" />
        ) : summaries.isError ? (
          <ErrorState
            title="Could not load projects"
            error={summaries.error}
            onRetry={() => void summaries.refetch()}
          />
        ) : summaries.data.items.length === 0 ? (
          <EmptyState title="No projects yet" description="Create your first project above." />
        ) : (
          <>
            <ProjectsTable projects={summaries.data.items} />
            <Pagination
              page={summaries.data.page}
              size={summaries.data.size}
              totalItems={summaries.data.totalItems}
              onPageChange={(next) => void navigate({ search: { page: next, size } })}
            />
          </>
        )}
      </section>
    </div>
  );
}
