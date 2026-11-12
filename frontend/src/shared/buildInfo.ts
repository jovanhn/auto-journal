/**
 * Build metadata of this frontend bundle (specs/app-versioning.md, decision 5), fixed at build time by
 * vite.config.ts.
 */
export interface BuildInfo {
  component: 'frontend' | 'backend';
  version: string;
  gitSha: string;
  buildId: string;
  buildTime: string;
}

export const BUILD_INFO: BuildInfo = __BUILD_INFO__;

/** The Settings footer is hidden only when the deploy sets `VITE_SHOW_BUILD_INFO=false` (decision 8a). */
export const showBuildInfo = (): boolean => import.meta.env.VITE_SHOW_BUILD_INFO !== 'false';
