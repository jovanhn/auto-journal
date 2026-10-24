import { Monitor, Moon, Sun } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button } from '@/shared/ui/button';
import { selectThemeMode, setThemeMode, type ThemeMode } from '../themeSlice';

const NEXT: Record<ThemeMode, ThemeMode> = { light: 'dark', dark: 'system', system: 'light' };
const ICON = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const mode = useAppSelector(selectThemeMode);
  const dispatch = useAppDispatch();
  const Icon = ICON[mode];

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Theme: ${mode}. Switch to ${NEXT[mode]}`}
      onClick={() => dispatch(setThemeMode(NEXT[mode]))}
    >
      <Icon />
    </Button>
  );
}
