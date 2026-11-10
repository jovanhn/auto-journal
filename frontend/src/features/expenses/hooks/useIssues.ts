import { useGetIssue, useListIssues } from '@/shared/api/generated/endpoints/issues/issues';

/** A vehicle's open and resolved issues, each in BR-IS6 order. */
export function useIssues(vehicleId: string) {
  return useListIssues(vehicleId);
}

/** One issue (Edit issue, Resolved issue). */
export function useIssue(issueId: string) {
  return useGetIssue(issueId);
}
