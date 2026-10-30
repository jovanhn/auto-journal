---
name: ship-next-spec
description: Take the next Planned spec in docs/specs and ship it end to end in this repo - read and check it, plan, implement (contract → backend → frontend → tests → docs), get the E2E plans reviewed, run the full check, open a PR, wait for CI and merge it. Use when the user asks to continue with the next spec/feature/release ("nastavi sa sledećim specom", "implement the next spec", "ship the next feature"), or names a spec to ship the same way.
---

# Ship the next spec

The repo's rules live in `AGENTS.md` (root) and each sub-project's `AGENTS.md`. They win over this skill;
this skill only puts them in order and adds what was learned while shipping auth and vehicles.

Work autonomously, but **stop and ask** at the checkpoints marked ✋. Talk to the user in their language.

## 0. Start clean

1. `git status` must be clean apart from the untracked skill files (`.agents/`, `.claude/skills/`,
   `skills-lock.json`). If there is other uncommitted work, ask what to do with it.
2. `git checkout main && git pull --ff-only`. If local `main` has diverged, check with
   `git cherry -v origin/main main` that every local commit is already upstream (`-` lines) before
   `git reset --hard origin/main`; otherwise ask.
3. Docker must run (Testcontainers, local Postgres). On Windows, if `docker info` fails, start
   `C:\Program Files\Docker\Docker\Docker Desktop.exe` and wait until `docker info` succeeds.
4. Tools on this machine: `make` is not on the Git Bash PATH, so run the commands behind each Makefile
   target. Use the pinned pnpm: `npx -y pnpm@<version from frontend/package.json packageManager>`.

## 1. Pick the spec

- If the user named a spec, use it. Otherwise take the specs in `docs/specs/` whose Status is `Planned`,
  pick the lowest release (v1 → v2 → v3), and within it the first one whose `Depends on:` specs are all
  `Implemented`.
- ✋ If two specs are equally eligible, ask which one goes first.
- Tell the user in one line which spec you picked and why.

## 2. Read and check

Read, in this order: the spec; `docs/domain/` (entities, business rules, glossary); the ADRs it references;
`docs/architecture.md`; for UI work `docs/design/design.md` and the affected `docs/design/screens/src/`
screens; the `AGENTS.md` of every sub-project you will touch. Look at the module that is currently the
reference (see `backend/AGENTS.md`, "Reference implementations").

✋ Stop and ask before writing code when:
- the spec, domain, contract or design conflict, or the spec has open questions;
- a requirement is only in a mock, not in domain/spec;
- the contract change is breaking and the spec does not say it is approved;
- you would need a new dependency or framework (that also needs an ADR).

Then create `feat/<spec-name>` from `main`, set the spec Status to `In progress`, and give the user a short
plan: contract changes, migration, modules touched, screens, E2E flows. Don't wait for approval of the plan
unless a ✋ condition applies.

## 3. Implement

Follow the feature workflow in the root `AGENTS.md`:

1. **Contract** first (`contracts/openapi.yaml`), then lint (`pnpm lint` in `contracts/`) and generate
   (`./mvnw generate-sources` in `backend/`, `pnpm gen` in `frontend/`).
2. **Backend:** migration (next free `V<n>`, never edit applied ones, RLS on every table) → entity →
   repository/DAO → service → controller. Cross-module access only through the other module's `api`
   package. Integration tests per acceptance criterion (`@IntegrationTest`, `truncateAll()`, add new
   tables to `DatabaseCleaner`). Run `./mvnw ktlint:format` then `./mvnw -B verify`.
3. **Frontend:** feature hooks wrap generated hooks; forms per the forms standard; every page has loading,
   empty and error states; design tokens only (new tokens go to `src/index.css`). Component tests with
   `renderApp` + MSW. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
4. **Docs:** `docs/architecture.md` (module map), `docs/domain/entities.md`, the `Enforced` column in
   `docs/domain/business-rules.md`, `docs/operations.md` and `.env.example` for new env vars, an ADR for
   any architectural change. Delegating this sweep to one subagent is fine; review its diff.

Use the Edit/Write tools for file changes. Python or PowerShell writes on Windows produce CRLF; if any
file ends up with CRLF, convert it back to LF before committing (`file <path>` shows it).

## 4. E2E ✋

If the spec's **E2E** section lists flows:

1. Write one plan per flow in `e2e/plans/<flow>.md` (Status `Draft — awaiting human review`) and add rows
   to `e2e/CRITICAL_FLOWS.md`.
2. ✋ Show the user a short summary of each plan and **wait for their review**. Never generate a test from
   an unreviewed plan.
3. After approval, set the plans to `Reviewed <date>`, write `e2e/tests/<flow>.spec.ts`, update
   `CRITICAL_FLOWS.md`, and keep `seed.spec.ts` and the `api` fixture current.

Lessons from earlier flows:
- All tests share one E2E user and run in parallel: use `uniqueName()`, never assume an empty list or that
  "my" item is last; compare against data the test created itself.
- Match URLs by path (`isHome`, `isSignIn` in `fixtures/urls.ts`); routes may add search params.
- Sonner toasts are `listitem`s too; scope list locators to the named list.
- Playwright reuses a server already listening on :8080 locally. Before `pnpm test` in `e2e/`, stop any
  backend you started earlier with old code (check `netstat -ano | grep :8080`), then build the jar
  (`./mvnw -B -q -DskipTests package`) and the frontend (`pnpm build`).

## 5. Full check

Run everything `make check` runs: contracts lint, backend `verify`, frontend lint/typecheck/test/build,
and e2e. All of it must pass. Fix failures; if an E2E failure means behavior changed, ✋ ask whether the
spec or the code is wrong. Never weaken a business assertion to make a test pass.

Set the spec Status to `Implemented` (with release) once everything is green.

## 6. Commit, PR, merge

1. Conventional commits, one per area, each ending with the attribution lines from the system reminder:
   `feat(contracts)` (with `!` and a `BREAKING CHANGE:` footer when breaking), `feat(<module>)` for the
   backend, `feat(frontend)`, `test(e2e)`, `docs(docs)`. Don't commit the untracked skill files unless
   asked.
2. `git push -u origin feat/<spec-name>`, then `gh pr create --base main` with a body that summarizes
   contract, backend, frontend, E2E and docs changes and the local check results.
3. Wait for CI: `gh pr checks <n> --watch` in the background. If a check fails, read its log
   (`gh run view --log-failed`), fix, push, and wait again. Never merge a red or pending PR.
4. When `ci-ok` is green and `gh pr view <n> --json mergeable` is `MERGEABLE`, merge with
   `gh pr merge <n> --rebase --delete-branch` (the repo keeps a linear history of conventional commits).
5. `git checkout main && git pull --ff-only` (or the `git cherry` check from step 0 if it diverged).

## 7. Report

Tell the user, briefly: what shipped (PR link), what was checked, anything you decided along the way that
they should know, and which spec is next. If the app is running locally for them, restart it on the new
code (backend `./mvnw spring-boot:run`, frontend `pnpm dev` → http://localhost:5173).
