import { http as mswHttp, HttpResponse } from 'msw';
import { api, server } from '@/test/server';
import { problem } from '@/test/fixtures';
import { ApiError, http } from './http';

describe('http mutator', () => {
  it('re-roots contract paths on the configured base URL and returns JSON', async () => {
    server.use(mswHttp.get(api('/projects'), () => HttpResponse.json({ ok: true })));

    await expect(http<{ ok: boolean }>('/api/projects')).resolves.toEqual({ ok: true });
  });

  it('parses ProblemDetail error responses into a typed ApiError', async () => {
    server.use(
      mswHttp.post(api('/projects'), () =>
        HttpResponse.json(
          problem(409, {
            title: 'Conflict',
            detail: 'Duplicate',
            errors: [{ field: 'name', message: 'Taken' }],
          }),
          { status: 409, headers: { 'Content-Type': 'application/problem+json' } },
        ),
      ),
    );

    const error = await http('/api/projects', { method: 'POST' }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe('Duplicate');
    expect(apiError.fieldErrors).toEqual([{ field: 'name', message: 'Taken' }]);
  });

  it('wraps non-ProblemDetail errors in an ApiError with the HTTP status', async () => {
    server.use(mswHttp.get(api('/projects'), () => new HttpResponse('boom', { status: 502 })));

    const error = await http('/api/projects').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(502);
  });
});
