# AGENTS.md — docs

```
docs/
  architecture.md   overview, module map, request flow
  operations.md     local setup, env vars, production (Supabase) notes
  domain/           glossary.md, entities.md, business-rules.md — the top source of truth
  specs/            _template.md + one spec per feature
  adr/              _template.md + numbered ADRs
  design/           design.md (tokens, components, screens, open questions, changelog),
                    screens/ (Claude Design export + generated src/), tools/
```

Source-of-truth order: `domain` → `specs` → `contracts/openapi.yaml` → code. If they conflict, stop and ask.

## Writing specs

- Copy `specs/_template.md` to `specs/<feature-name>.md` (kebab-case). Keep every section; write "none" or
  "n/a" rather than deleting one.
- **Status:** `Planned` → `In progress` (when work starts) → `Implemented` (when merged with tests).
  Planned specs also name their **release** (v1 = MVP: auth, vehicles, expenses; v2 = insights;
  v3 = planned expenses). Build releases in order; keep each spec as small as its goal allows.
- Business rules reference IDs in `domain/business-rules.md`; add new rules there first.
- Acceptance criteria are numbered Given/When/Then; tests are written from them.
- **E2E** lists critical user flows only (or "none"); each becomes a plan in `e2e/plans/`.
- Don't invent requirements. Unclear points go in the spec as open questions and are asked before coding.

## Writing ADRs

- Copy `adr/_template.md` to `adr/NNNN-<kebab-title>.md` with the next number. Sections: Status, Context,
  Decision, Consequences, Alternatives considered.
- Write an ADR for any architectural change, new dependency/framework, or change to a standard.
- **ADRs are immutable once Accepted.** To change a decision, write a new ADR that supersedes it, and only
  update the old ADR's Status line to `Superseded by [NNNN](...)`.

## Updating the design

Follow the iteration workflow in [design/design.md](design/design.md#updating-the-design-iteration-workflow):
replace the export in `design/screens/`, run `make design-unpack`, review the `design/screens/src/` diff, and
update `design.md` (tokens, components, screen inventory, open questions, changelog) in the same commit.
Never hand-edit the export or `screens/src/`. Design gaps that imply behavior go to `domain/` / `specs/`.

## Keeping docs current

Update `domain/entities.md` for schema changes (and table ownership), `architecture.md` for module changes,
`operations.md` for new env vars (also `.env.example`).
