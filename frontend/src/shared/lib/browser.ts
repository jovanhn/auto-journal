/** Leaves the app for another site (e.g. back to an OAuth client). Separate module so tests can mock it. */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
