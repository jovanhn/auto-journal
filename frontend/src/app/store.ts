import { combineSlices, configureStore } from '@reduxjs/toolkit';
import { themeSlice } from '@/features/theme/themeSlice';

/**
 * Redux holds client/UI state only. Server data lives in TanStack Query — never put API
 * responses in a slice. Slices are colocated in their feature and registered here.
 */
const rootReducer = combineSlices(themeSlice);

export type RootState = ReturnType<typeof rootReducer>;

export const makeStore = (preloadedState?: Partial<RootState>) =>
  configureStore({ reducer: rootReducer, preloadedState });

export type AppStore = ReturnType<typeof makeStore>;
export type AppDispatch = AppStore['dispatch'];
