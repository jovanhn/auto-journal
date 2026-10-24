import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** Client/UI state only (never server data). Persisted to localStorage by `useApplyTheme`. */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
  mode: ThemeMode;
}

export const THEME_STORAGE_KEY = 'autojournal.theme';

const readStoredMode = (): ThemeMode => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  } catch {
    return 'system';
  }
};

const initialState = (): ThemeState => ({ mode: readStoredMode() });

export const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
  },
  selectors: {
    selectThemeMode: (state) => state.mode,
  },
});

export const { setThemeMode } = themeSlice.actions;
export const { selectThemeMode } = themeSlice.selectors;
