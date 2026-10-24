import { useEffect } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectThemeMode, THEME_STORAGE_KEY } from '../themeSlice';

// matchMedia is missing in some environments (e.g. jsdom).
const darkQuery = (): MediaQueryList | undefined =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : undefined;

/** Applies the theme mode to <html> (shadcn `.dark` class) and persists it. */
export function useApplyTheme(): void {
  const mode = useAppSelector(selectThemeMode);

  useEffect(() => {
    const query = darkQuery();
    const apply = () => {
      const dark = mode === 'dark' || (mode === 'system' && query?.matches === true);
      document.documentElement.classList.toggle('dark', dark);
    };
    apply();
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch {
      // Storage unavailable (private mode): theme still applies for this session.
    }
    if (mode !== 'system' || !query) return;
    query.addEventListener('change', apply);
    return () => {
      query.removeEventListener('change', apply);
    };
  }, [mode]);
}
