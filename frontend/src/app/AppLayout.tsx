import { Link, Outlet } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import { ThemeToggle } from '@/features/theme/components/ThemeToggle';
import { Button } from '@/shared/ui/button';

/** Shell of every signed-in page: app bar with Settings (specs/auth.md) and the page content. */
export function AppLayout() {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            autojournal
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings" aria-label="Settings">
                <Settings />
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}
