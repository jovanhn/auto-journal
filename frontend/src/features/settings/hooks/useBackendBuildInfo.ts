import { useGetStatus } from '@/shared/api/generated/endpoints/system/system';
import { GetStatusResponse } from '@/shared/api/generated/zod/system/system.zod';

const TIMEOUT_MS = 5000;

/**
 * The backend's build metadata from `GET /api/status` (specs/app-versioning.md, AC 6–7). One try with a short
 * timeout and no wake-up protocol: a sleeping backend shows as unavailable. A body that is not the status JSON
 * resolves to `null`.
 */
export function useBackendBuildInfo({ enabled }: { enabled: boolean }) {
  return useGetStatus({
    query: {
      enabled,
      retry: false,
      staleTime: Infinity,
      select: (data) => GetStatusResponse.safeParse(data).data ?? null,
    },
    request: { signal: AbortSignal.timeout(TIMEOUT_MS) },
  });
}
