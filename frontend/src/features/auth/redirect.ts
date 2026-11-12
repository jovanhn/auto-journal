/** Only same-app paths are followed after sign-in (no open redirects). */
export const safeRedirect = (target: string | undefined): string =>
  target?.startsWith('/') && !target.startsWith('//') ? target : '/';
