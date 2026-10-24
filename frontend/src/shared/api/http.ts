/**
 * The single HTTP entry point for all generated API calls (Orval mutator).
 *
 * - Base URL comes from VITE_API_BASE_URL (default `/api`, proxied to the backend by Vite).
 * - Non-2xx responses are parsed as RFC 9457 ProblemDetail and thrown as a typed {@link ApiError}.
 * - This is the only place where an Authorization header will be added (Supabase Auth, ADR 0008).
 */
import type { FieldError, ProblemDetail } from './generated/model';

const API_PREFIX = '/api';

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;

  constructor(problem: ProblemDetail) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
    this.problem = problem;
  }

  /** Field-level validation / domain errors (`ProblemDetail.errors`). */
  get fieldErrors(): FieldError[] {
    return this.problem.errors ?? [];
  }
}

/** Orval uses this to type the `error` of every generated query and mutation. */
export type ErrorType<_Error> = ApiError;

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

const baseUrl = (): string => (import.meta.env.VITE_API_BASE_URL ?? API_PREFIX).replace(/\/$/, '');

/** Generated URLs are contract paths (`/api/...`); re-root them on the configured base URL. */
const resolveUrl = (url: string): string =>
  baseUrl() + (url.startsWith(API_PREFIX) ? url.slice(API_PREFIX.length) : url);

const isProblemDetail = (body: unknown): body is ProblemDetail =>
  typeof body === 'object' && body !== null && 'status' in body && 'title' in body;

const parseBody = async (res: Response): Promise<unknown> => {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
};

export const http = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json, application/problem+json');
  // Future: headers.set('Authorization', `Bearer ${token}`) — keep auth here and nowhere else.

  let res: Response;
  try {
    res = await fetch(resolveUrl(url), { ...init, headers });
  } catch {
    throw new ApiError({ title: 'Network error', status: 0, detail: 'Could not reach the server.' });
  }

  const body = await parseBody(res);
  if (!res.ok) {
    throw new ApiError(
      isProblemDetail(body) ? body : { title: res.statusText || 'Request failed', status: res.status },
    );
  }
  return body as T;
};
