import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, useRouter } from '@tanstack/react-router';
import { useApplyTheme } from '@/features/theme/hooks/useApplyTheme';
import { selectThemeMode } from '@/features/theme/themeSlice';
import { onSignedOut } from '@/shared/auth/session';
import { Toaster } from '@/shared/ui/sonner';
import { useAppSelector } from './hooks';

export function RootLayout() {
  useApplyTheme();
  const themeMode = useAppSelector(selectThemeMode);
  const queryClient = useQueryClient();
  const router = useRouter();

  // However the user is signed out (button, failed refresh, 401), drop their cached data and show sign-in.
  useEffect(
    () =>
      onSignedOut(() => {
        queryClient.clear();
        void router.navigate({ to: '/sign-in' });
      }),
    [queryClient, router],
  );

  return (
    <div className="min-h-svh">
      <Outlet />
      <Toaster theme={themeMode} richColors />
    </div>
  );
}
