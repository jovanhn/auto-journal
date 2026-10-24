import { keepPreviousData } from '@tanstack/react-query';
import { useListProjects } from '@/shared/api/generated/endpoints/projects/projects';

/** Paginated project summaries (with task counts). Keeps the previous page visible while paging. */
export function useProjectSummaries(page: number, size: number) {
  return useListProjects({ page, size }, { query: { placeholderData: keepPreviousData } });
}
