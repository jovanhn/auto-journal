# 0007. Forms: React Hook Form + Zod

- **Status:** Accepted
- **Date:** 2026-10-24

## Context

Forms must validate consistently with the API contract, show server-side errors (e.g. duplicate name) on
the right field, and behave the same across features.

## Decision

- React Hook Form + Zod via `@hookform/resolvers/zod`.
- Form schemas start from the Orval-generated Zod schemas (`src/shared/api/generated/zod`) and are extended
  only for UI-only rules (trimming, friendly messages); limits come from the contract.
- Server errors: `applyServerErrors` (`src/shared/lib/form.ts`) maps `ProblemDetail.errors` onto fields with
  `setError`; anything else becomes a form-level error rendered with `FormErrorAlert`.
- Behavior: `mode: 'onBlur'`, `reValidateMode: 'onChange'` (validate on blur, re-validate on change after
  the first submit); submit is disabled while pending.
- Markup: shadcn `Field` components (`Field`, `FieldLabel`, `FieldError`) wired through RHF `Controller`.
  The current shadcn registry ships `field` for this; the older `form` component is no longer provided by
  the `radix-nova` style.
- Forms receive an `onSubmit(values) => Promise` prop; pages own the mutation.

## Consequences

- Contract changes flow into form validation automatically after `make gen`.
- One place to change server-error mapping.

## Alternatives considered

- **Formik / TanStack Form** — not chosen; RHF + Zod was a fixed decision.
- **Hand-written validation** — drifts from the contract.
