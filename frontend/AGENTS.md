# AGENTS.md — frontend

React + TypeScript (strict) + Vite, pnpm. See ADRs 0006, 0007, 0011 and [docs/architecture.md](../docs/architecture.md).

## Structure

```
src/
  app/        providers, Redux store + typed hooks, query client, root route, router (code-based)
  features/   <feature>/ components/, hooks/, routes/ (route defs + pages), <name>Slice.ts, schemas.ts
  shared/     api/ (http.ts mutator, generated/ ← Orval, never edit), ui/ (shadcn primitives + shared
              components), lib/ (cn, form helpers, money formatting)
  test/       setup, MSW server, fixtures, renderApp
```

- Features must not import other features' internals (ESLint enforces); share through `src/shared/`.
  Inside a feature, use relative imports. `app/` may import features to wire routes and slices.
- New routes: export `createRoute(...)` objects from `features/<feature>/routes/index.ts`, attach them in
  `app/router.tsx`. Pages read params/search via `getRouteApi('<path>')`.

## State placement

| State                                  | Where                                   |
| -------------------------------------- | --------------------------------------- |
| Server data                            | TanStack Query (generated Orval hooks)  |
| Shared UI state                        | Redux Toolkit slice in the feature      |
| Form state                             | React Hook Form                         |
| URL-worthy state (filters, pagination) | Router search params (`validateSearch`) |
| Local component state                  | `useState`                              |

Never put server data in Redux. Use `useAppDispatch` / `useAppSelector` from `@/app/hooks`.

## API layer and query keys

- `pnpm gen` (runs automatically before dev/build/test) generates hooks + Zod schemas from
  `../contracts/openapi.yaml` into `src/shared/api/generated/` (gitignored).
- `src/shared/api/http.ts` is the only HTTP entry point: base URL from `VITE_API_BASE_URL` (default `/api`),
  non-2xx → typed `ApiError` (parsed `ProblemDetail`, `fieldErrors`). Future auth header goes **only** here.
- Feature hooks wrap generated hooks (`features/<f>/hooks/useX.ts`); components never call generated hooks
  or `fetch` directly.
- Query keys: use the generated `get<Operation>QueryKey(...)` functions. Invalidate by prefix — call the
  key function without params, e.g. `queryClient.invalidateQueries({ queryKey: getListVehiclesQueryKey() })`.
  Mutations invalidate every query whose data they change (e.g. `useUpdateVehicle` invalidates the vehicle
  list and `getGetVehicleQueryKey(vehicleId)`).
- Never use supabase-js or any other client to access data.

## Forms standard

- React Hook Form + Zod (`zodResolver`). Schemas start from generated Zod schemas
  (`@/shared/api/generated/zod/...`) and extend only for UI-only rules. When inputs hold text (numbers,
  money), re-declare the fields as strings but take every limit from the generated contract constants
  (see `features/vehicles/schemas.ts`).
- `mode: 'onBlur'`, `reValidateMode: 'onChange'`; disable submit while `formState.isSubmitting`.
- Server errors: `catch (e) { applyServerErrors(e, form.setError, FIELDS) }`; render
  `<FormErrorAlert message={form.formState.errors.root?.server?.message} />` for non-field errors.
- Markup: shadcn `Field` / `FieldLabel` / `FieldError` + RHF `Controller`; every input has a label;
  `aria-invalid` on invalid inputs.
- Forms take `onSubmit(values) => Promise`; the page performs the mutation (see `VehicleForm` and `AddVehiclePage`).

## Components and UI

- **Design:** follow [docs/design/design.md](../docs/design/design.md) (tokens, components, screen shells)
  and the screen sources in `docs/design/screens/src/`. Mobile-first (390 px). Translate mock colors and sizes
  to the theme CSS variables and Tailwind classes; never copy the mocks' hex values or inline styles. New
  design tokens go into `src/index.css` (light and dark), not into components.

- One component per file, PascalCase filename, named export, explicit props type. (shadcn primitives in
  `shared/ui/` keep their lowercase CLI filenames.)
- Pages compose; feature hooks fetch; presentational components get data via props and never fetch.
- Every page handles loading, empty, and error states with `LoadingState`, `EmptyState`, `ErrorState`.
- Tailwind classes only, merged with `cn()`; no inline styles. Restyle primitives via `cva` variants, don't
  fork them per feature. Add primitives with `pnpm exec shadcn add <name>` (only what you use).
- Light/dark theme via CSS variables in `src/index.css` and the `theme` feature.

## Testing

- Vitest + React Testing Library + MSW. Render the real app with `renderApp(url)`; mock HTTP with
  `server.use(http.get(api('/vehicles'), ...))` — unhandled requests fail the test.
- Query by role/label/text, not class names or test IDs. Use `userEvent`.
- Cover: data rendering, empty and error states, form validation, server field errors.

## Commands (in `frontend/`)

| Command          | What                                          |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Dev server on :5173 (proxies `/api` → :8080)  |
| `pnpm gen`       | Regenerate API client                         |
| `pnpm lint`      | ESLint + Prettier check (`pnpm format` fixes) |
| `pnpm typecheck` | `tsc` (no emit)                               |
| `pnpm test`      | Vitest (`pnpm test:watch` for watch mode)     |
| `pnpm build`     | Production build                              |
