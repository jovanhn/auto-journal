# 0011. UI: Tailwind CSS + shadcn/ui

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

The frontend needs accessible, consistent components that agents can modify safely, with light and dark
themes, without locking into a heavyweight component library.

## Decision

- **Tailwind CSS** (v4, `@tailwindcss/vite`) and **shadcn/ui** (Radix-based, `radix-nova` style),
  initialized with the shadcn CLI for Vite. Component code is owned in the repo under `src/shared/ui/`;
  only components actually used are added (`shadcn add <name>`).
- Icons: `lucide-react`. Toasts: `sonner` (adapted to take the theme from Redux instead of `next-themes`).
  Tables: TanStack Table via the shadcn data-table pattern.
- Theme via shadcn CSS variables in `src/index.css`; light and dark mode (`.dark` class) from the start,
  controlled by the `theme` feature (light / dark / system).
- Class merging with `cn()` (`src/shared/lib/utils.ts`, backed by shadcn's `cn` package, which the
  current shadcn CLI installs instead of clsx + tailwind-merge).
- `src/shared/ui/` primitives are a design system: restyle via variants (`cva`), don't fork per feature.
  Feature-specific components live in `src/features/<feature>/components/`.

Component conventions:

- One component per file, named exports, explicit props type. Our components use PascalCase filenames;
  shadcn primitives keep the CLI's lowercase filenames so `shadcn add` can update them.
- Pages (route components) compose; feature hooks fetch (wrapping generated Orval hooks); presentational
  components receive data via props and never fetch.
- Every page handles loading, empty, and error states with the shared `LoadingState`, `EmptyState`,
  `ErrorState` components.
- Accessibility: use the primitives; no clickable `div`s; every input has a label; forms use shadcn `Field`
  components wired to React Hook Form.
- No inline styles; Tailwind classes only, merged with `cn()`.

## Consequences

- Upgrading a shadcn component is a deliberate diff, not a version bump.
- A system font stack is used (the CLI's Geist font package was removed to avoid an extra dependency).

## Alternatives considered

- **MUI / Chakra / Mantine** — runtime-styled libraries, harder to customize, larger bundles.
- **Headless Radix only** — more styling work per component.
