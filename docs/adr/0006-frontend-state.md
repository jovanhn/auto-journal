# 0006. Frontend state: TanStack Query for server state, Redux Toolkit for client state

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Mixing server data into a client store leads to stale caches, manual loading flags, and duplicated
invalidation logic. Client UI state (theme, panels) still needs a predictable shared store.

## Decision

| State                                  | Where                         |
| -------------------------------------- | ----------------------------- |
| Server data                            | TanStack Query                |
| Shared UI state                        | Redux Toolkit                 |
| Form state                             | React Hook Form (ADR 0007)    |
| URL-worthy state (filters, pagination) | TanStack Router search params |
| Local component state                  | `useState`                    |

- All server data comes from Orval-generated TanStack Query hooks, wrapped by feature hooks.
- Query keys are the Orval-generated keys (`get<Operation>QueryKey(...)`); invalidate by prefix
  (call the key function without params) in mutation `onSuccess`.
- Redux slices are colocated in their feature and registered in `app/store.ts`; use the typed
  `useAppDispatch` / `useAppSelector`. **Never put server data in Redux.**
- Routing: TanStack Router with code-based routes exported by each feature.

## Consequences

- Caching, refetching, and loading/error states come from one library.
- Redux stays small; reviewers reject API responses in slices.

## Alternatives considered

- **RTK Query** — would put server state in Redux and duplicate Orval's generated hooks.
- **Redux for everything** — manual cache management.
- **Zustand / Context only** — Redux Toolkit was a fixed decision; Context re-renders broadly.
