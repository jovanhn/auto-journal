import { ApiError } from '@/shared/api/http';
import { problem } from '@/test/fixtures';
import { applyServerErrors, ROOT_SERVER_ERROR } from './form';

type Values = { name: string; description: string };
const FIELDS = ['name', 'description'] as const;

describe('applyServerErrors', () => {
  it('maps known ProblemDetail field errors onto form fields', () => {
    const setError = vi.fn();
    const error = new ApiError(problem(409, { errors: [{ field: 'name', message: 'Taken' }] }));

    applyServerErrors<Values>(error, setError, FIELDS);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith(
      'name',
      { type: 'server', message: 'Taken' },
      { shouldFocus: true },
    );
  });

  it('shows errors without field details as a form-level error', () => {
    const setError = vi.fn();

    applyServerErrors<Values>(new ApiError(problem(500, { detail: 'Server exploded' })), setError, FIELDS);

    expect(setError).toHaveBeenCalledWith(ROOT_SERVER_ERROR, { type: 'server', message: 'Server exploded' });
  });

  it('shows errors for unknown fields as a form-level error', () => {
    const setError = vi.fn();
    const error = new ApiError(problem(400, { errors: [{ field: 'other', message: 'Bad' }] }));

    applyServerErrors<Values>(error, setError, FIELDS);

    expect(setError).toHaveBeenCalledWith(ROOT_SERVER_ERROR, { type: 'server', message: 'other: Bad' });
  });

  it('shows a generic form-level error for non-API errors', () => {
    const setError = vi.fn();

    applyServerErrors<Values>(new TypeError('x'), setError, FIELDS);

    expect(setError).toHaveBeenCalledWith(ROOT_SERVER_ERROR, expect.objectContaining({ type: 'server' }));
  });
});
