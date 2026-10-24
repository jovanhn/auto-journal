import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/shared/api/http';

export const ROOT_SERVER_ERROR = 'root.server' as const;

const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * Maps a failed request onto a React Hook Form:
 * - `ProblemDetail.errors` entries whose `field` is a known form field → `setError(field)`.
 * - Everything else (unknown fields, errors without field details, network errors) →
 *   a form-level error at `root.server`, rendered with `<FormErrorAlert>`.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!isApiError(error)) {
    setError(ROOT_SERVER_ERROR, { type: 'server', message: GENERIC_ERROR });
    return;
  }

  const unmatched: string[] = [];
  let matched = 0;
  for (const { field, message } of error.fieldErrors) {
    const known = fields.find((f) => f === field);
    if (known) {
      setError(known, { type: 'server', message }, { shouldFocus: matched === 0 });
      matched += 1;
    } else {
      unmatched.push(`${field}: ${message}`);
    }
  }

  if (unmatched.length > 0) {
    setError(ROOT_SERVER_ERROR, { type: 'server', message: unmatched.join(' ') });
  } else if (matched === 0) {
    setError(ROOT_SERVER_ERROR, { type: 'server', message: error.message || GENERIC_ERROR });
  }
}
