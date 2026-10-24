import { useQueryClient } from '@tanstack/react-query';
import {
  getListProjectsQueryKey,
  useCreateProject as useCreateProjectMutation,
} from '@/shared/api/generated/endpoints/projects/projects';

/** Creates a project, then invalidates every project-list page (key prefix without params). */
export function useCreateProject() {
  const queryClient = useQueryClient();
  return useCreateProjectMutation({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
    },
  });
}
