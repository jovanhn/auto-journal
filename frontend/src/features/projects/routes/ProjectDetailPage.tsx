import { getRouteApi } from '@tanstack/react-router';
import { toast } from 'sonner';
import { isApiError } from '@/shared/api/http';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { ErrorState } from '@/shared/ui/ErrorState';
import { LoadingState } from '@/shared/ui/LoadingState';
import { Pagination } from '@/shared/ui/Pagination';
import { AddTaskForm } from '../components/AddTaskForm';
import { ProjectHeader } from '../components/ProjectHeader';
import { TaskList } from '../components/TaskList';
import { useCreateTask } from '../hooks/useCreateTask';
import { useProject } from '../hooks/useProject';
import { useProjectTasks } from '../hooks/useProjectTasks';
import type { CreateTaskFormValues } from '../schemas';

const route = getRouteApi('/_app/projects/$projectId');

export function ProjectDetailPage() {
  const { projectId } = route.useParams();
  const { page, size } = route.useSearch();
  const navigate = route.useNavigate();
  const project = useProject(projectId);
  const tasks = useProjectTasks(projectId, page, size);
  const createTask = useCreateTask(projectId);

  const handleAddTask = async (values: CreateTaskFormValues) => {
    const task = await createTask.mutateAsync({ projectId, data: { title: values.title } });
    toast.success(`Task “${task.title}” added`);
  };

  if (project.isPending) return <LoadingState label="Loading project…" />;
  if (project.isError) {
    const notFound = isApiError(project.error) && project.error.status === 404;
    return notFound ? (
      <EmptyState title="Project not found" description="It may have been removed, or the link is wrong." />
    ) : (
      <ErrorState
        title="Could not load project"
        error={project.error}
        onRetry={() => void project.refetch()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ProjectHeader project={project.data} />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>New task</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddTaskForm onSubmit={handleAddTask} />
        </CardContent>
      </Card>

      <section aria-labelledby="task-list-heading" className="flex flex-col gap-4">
        <h2 id="task-list-heading" className="text-lg font-medium">
          Tasks
        </h2>
        {tasks.isPending ? (
          <LoadingState label="Loading tasks…" />
        ) : tasks.isError ? (
          <ErrorState title="Could not load tasks" error={tasks.error} onRetry={() => void tasks.refetch()} />
        ) : tasks.data.items.length === 0 ? (
          <EmptyState title="No tasks yet" description="Add the first task above." />
        ) : (
          <>
            <TaskList tasks={tasks.data.items} />
            <Pagination
              page={tasks.data.page}
              size={tasks.data.size}
              totalItems={tasks.data.totalItems}
              onPageChange={(next) => void navigate({ search: { page: next, size } })}
            />
          </>
        )}
      </section>
    </div>
  );
}
