import { Link, Outlet } from '@tanstack/react-router';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';
import { useApplyTheme } from '@/features/theme/hooks/useApplyTheme';
import { useAppSelector } from './hooks';
import { selectThemeMode } from '@/features/theme/themeSlice';
import { Toaster } from '@/shared/ui/sonner';

export function RootLayout() {
  useApplyTheme();
  const themeMode = useAppSelector(selectThemeMode);

  return (
    <div className="min-h-svh">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            autojournal
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
      <Toaster theme={themeMode} richColors />
    </div>
  );
}
