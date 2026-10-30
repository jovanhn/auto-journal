# Critical flows

E2E covers **critical user flows only**. Every flow has a spec section, a reviewed plan, and one test file.
Edge cases belong in backend and frontend tests.

| Flow | Spec | Plan | Test |
| ---- | ---- | ---- | ---- |
| `projects-overview` — create a project and see it in the list; duplicate name shown on the field | [docs/specs/projects-overview.md](../docs/specs/projects-overview.md#e2e) | [plans/projects-overview.md](plans/projects-overview.md) | [tests/projects-overview.spec.ts](tests/projects-overview.spec.ts) |
| `sign-in` — sign in and reach home; reload keeps the session; sign out returns to sign-in | [docs/specs/auth.md](../docs/specs/auth.md#e2e) | [plans/sign-in.md](plans/sign-in.md) | [tests/sign-in.spec.ts](tests/sign-in.spec.ts) |
