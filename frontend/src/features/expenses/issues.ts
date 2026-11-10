import type { Issue, IssueOutcome, IssueSeverity, IssueSource } from '@/shared/api/generated/model';
import { journalDate, mediumDate } from '@/shared/lib/dates';
import { formatKm } from '@/shared/lib/money';

/** Chip order in the form (specs/issues.md, UI notes). */
export const ISSUE_SEVERITIES = ['WATCH', 'FIX_SOON', 'URGENT'] as const satisfies readonly IssueSeverity[];
export const ISSUE_SOURCES = [
  'NOTICED',
  'MECHANIC',
  'WARNING_LIGHT',
] as const satisfies readonly IssueSource[];
export const ISSUE_OUTCOMES = ['FIXED', 'GONE'] as const satisfies readonly IssueOutcome[];

export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  WATCH: 'Watch',
  FIX_SOON: 'Fix soon',
  URGENT: 'Urgent',
};

export const SOURCE_LABELS: Record<IssueSource, string> = {
  NOTICED: 'I noticed',
  MECHANIC: 'Mechanic',
  WARNING_LIGHT: 'Warning light',
};

/** Pill / list label of a resolved issue's outcome. */
export const OUTCOME_LABELS: Record<IssueOutcome, string> = {
  FIXED: 'Fixed',
  GONE: 'Gone',
};

/** Chip label in the Resolve sheet. */
export const OUTCOME_CHIP_LABELS: Record<IssueOutcome, string> = {
  FIXED: 'Fixed',
  GONE: 'Gone · not an issue',
};

/** `Mechanic · Oct 12 · 184,200 km` (open issue row). */
export const openIssueLine = (issue: Issue, currentYear: number): string =>
  [
    SOURCE_LABELS[issue.source],
    journalDate(issue.noticedOn, currentYear),
    ...(issue.odometer === null ? [] : [formatKm(issue.odometer)]),
  ].join(' · ');

/**
 * A resolved issue's outcome. The contract types it as a nullable `IssueOutcome`, which the generated model
 * widens to `string` (OpenAPI 3.0 needs `type` next to `nullable`).
 */
export const outcomeOf = (issue: Issue): IssueOutcome | null =>
  ISSUE_OUTCOMES.find((outcome) => outcome === issue.outcome) ?? null;

/** `Fixed · Oct 21, 2026` (resolved issue row). */
export const resolvedIssueLine = (issue: Issue): string => {
  const outcome = outcomeOf(issue);
  return outcome && issue.resolvedOn ? `${OUTCOME_LABELS[outcome]} · ${mediumDate(issue.resolvedOn)}` : '';
};
