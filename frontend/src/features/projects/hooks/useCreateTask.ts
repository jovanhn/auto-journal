import { useQueryClient } from '@tanstack/react-query';
import { getListProjectsQueryKey } from '@/shared/api/generated/endpoints/projects/projects';
import {
  getListProjectTasksQueryKey,
  useCreateTask as useCreateTaskMutation,
} from '@/shared/api/generated/endpoints/tasks/tasks';

/**
 * Adds a task, then invalidates the project's task lists and all project summaries
 * (their task counts changed).
 */
export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient();
  return useCreateTaskMutation({
    mutation: {
      onSuccess: () =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: getListProjectTasksQueryKey(projectId) }),
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
        ]),
    },
  });
}
