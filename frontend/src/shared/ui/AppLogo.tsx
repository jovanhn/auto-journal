import { cn } from 'cn';

/**
 * The autojournal brand mark: a fuel receipt on a brand-colored tile (docs/design/design.md#brand).
 * Drawn with the `--brand` tokens, which stay the same in light and dark. Decorative: the name next to it is the label.
 * Same drawing as `public/favicon.svg`.
 */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={cn('size-8 shrink-0', className)}
    >
      <rect width="64" height="64" rx="14" className="fill-brand" />
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-foreground">
        <path d="M19 12h26a4 4 0 0 1 4 4v33l-5-4-5 4-5-4-5 4-5-4-5 4V16a4 4 0 0 1 4-4z" strokeWidth={3.6} />
        <path d="M37.5 23h6M37.5 29h6M22 38h21.5" strokeWidth={3} />
        <path d="M29 23.5h1.6a1.4 1.4 0 0 1 1.4 1.4v4.6a1 1 0 0 0 2 0v-5.2l-1.6-1.8" strokeWidth={1.5} />
      </g>
      <g className="fill-brand-foreground">
        <path
          d="M22 21.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5V33h-7zM23.8 22.2v3.3h3.4v-3.3z"
          fillRule="evenodd"
        />
        <rect x="21" y="32.2" width="9" height="1.8" rx="0.9" />
      </g>
    </svg>
  );
}
