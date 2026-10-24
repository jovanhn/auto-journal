import { keepPreviousData } from '@tanstack/react-query';
import { useListProjectTasks } from '@/shared/api/generated/endpoints/tasks/tasks';

export function useProjectTasks(projectId: string, page: number, size: number) {
  return useListProjectTasks(projectId, { page, size }, { query: { placeholderData: keepPreviousData } });
}
