import { useGetProject } from '@/shared/api/generated/endpoints/projects/projects';

export function useProject(projectId: string) {
  return useGetProject(projectId);
}
