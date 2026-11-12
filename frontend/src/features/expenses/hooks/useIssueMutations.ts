import { useQueryClient } from '@tanstack/react-query';
import {
  getGetIssueQueryKey,
  getListIssuesQueryKey,
  useCreateIssue as useCreateIssueMutation,
  useDeleteIssue as useDeleteIssueMutation,
  useReopenIssue as useReopenIssueMutation,
  useResolveIssue as useResolveIssueMutation,
  useUpdateIssue as useUpdateIssueMutation,
} from '@/shared/api/generated/endpoints/issues/issues';
import type { Issue } from '@/shared/api/generated/model';

/** Issues change nothing else (BR-IS2): only the vehicle's list and the issue itself are refreshed. */
function useInvalidateIssues() {
  const queryClient = useQueryClient();
  return (issue: Pick<Issue, 'id' | 'vehicleId'>) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(issue.vehicleId) }),
      queryClient.invalidateQueries({ queryKey: getGetIssueQueryKey(issue.id) }),
    ]);
}

export function useCreateIssue() {
  const invalidate = useInvalidateIssues();
  return useCreateIssueMutation({ mutation: { onSuccess: (issue) => invalidate(issue) } });
}

export function useUpdateIssue() {
  const invalidate = useInvalidateIssues();
  return useUpdateIssueMutation({ mutation: { onSuccess: (issue) => invalidate(issue) } });
}

export function useResolveIssue() {
  const invalidate = useInvalidateIssues();
  return useResolveIssueMutation({ mutation: { onSuccess: (issue) => invalidate(issue) } });
}

export function useReopenIssue() {
  const invalidate = useInvalidateIssues();
  return useReopenIssueMutation({ mutation: { onSuccess: (issue) => invalidate(issue) } });
}

/** Deletes an issue of [vehicleId]; the deleted issue's own query is removed, not refetched. */
export function useDeleteIssue(vehicleId: string) {
  const queryClient = useQueryClient();
  return useDeleteIssueMutation({
    mutation: {
      onSuccess: async (_data, { issueId }) => {
        queryClient.removeQueries({ queryKey: getGetIssueQueryKey(issueId) });
        await queryClient.invalidateQueries({ queryKey: getListIssuesQueryKey(vehicleId) });
      },
    },
  });
}
