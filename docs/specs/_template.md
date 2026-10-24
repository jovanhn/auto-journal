# Spec: <feature name>

## Status

Planned | In progress | Implemented

## Goal

One or two sentences: what problem this solves and for whom.

## User stories

- As a <user>, I want <capability>, so that <benefit>.

## Business rules

Reference rule IDs from [docs/domain/business-rules.md](../domain/business-rules.md); add new rules there first.

- BR-xx: …

## Acceptance criteria

Write each criterion as Given/When/Then. Backend and frontend tests are written from these.

1. **<short name>**
   - Given …
   - When …
   - Then …

## Edge cases

- …

## API impact

Contract changes in `contracts/openapi.yaml` (new/changed paths, schemas, error responses). Mark breaking
changes explicitly — they require approval (contracts/AGENTS.md).

## UI notes

Pages, components, states (loading / empty / error), form behavior.

## E2E

Critical user flows that need an end-to-end test, or "none". Each flow gets a plan in `e2e/plans/` and is
registered in `e2e/CRITICAL_FLOWS.md`. Edge cases do not belong here.

- none

## Out of scope

- …
