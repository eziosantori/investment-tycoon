# Development workflow

How we build each milestone with the Matt Pocock engineering skills and a
subagent swarm. These skills are user-invoked: type the slash command, the
agent can't start them on its own.

## Once: setup

**`/setup-matt-pocock-skills`**: issue tracker (GitHub Issues on
`eziosantori/investment-tycoon`, for native blocking links), domain docs
(`GLOSSARY.md` + `docs/adr/`), and the "Agent skills" block in `CLAUDE.md`.

## Per milestone (one milestone at a time, starting with M1)

Steps 1–4 run in **one unbroken context window**: no `/clear` or `/compact`
until the tickets exist.

1. **`/grill-with-docs`**: interview on the milestone; writes `GLOSSARY.md`
   and ADRs as it goes. Shared vocabulary (base, breakout, stage, Mansfield
   RS…) is what keeps parallel agents consistent.
2. **Optional detours**, when a question can't be settled in conversation:
   - **`/prototype`**: throwaway code for "does it look/behave right?"
     (e.g. M1: do the generated stage cycles look realistic?).
   - **`/research`**: background agent reads primary sources and leaves a
     cited Markdown file (e.g. the exact Mansfield RS formula).
3. **`/to-spec`**: synthesizes the conversation into a spec issue; confirms
   the test seams first.
4. **`/to-tickets`**: tracer-bullet tickets with blocking edges. **This step
   decides how well the swarm runs**: push for a wide frontier (few blockers,
   many tickets startable at once), prefactoring tickets first, each ticket
   small enough for one fresh context window.
5. **`/clear`**, then **`/implement-spec`**: the swarm. Implementer subagents
   take the ready frontier in parallel, each in its own worktree driving
   `/tdd`; a merger subagent lands work on one integration branch and newly
   unblocked tickets start; one `/code-review` at the end, fixes applied.
6. **`/retro`** in the same session: improve the environment (checks, coding
   standards, steering files), not the code.

Then the next milestone, from step 1.

## Other entry points

- **`/wayfinder`**: only for genuinely foggy efforts, e.g. Phase 2 (Model
  Book: data provider, licensing, case-file schema). It maps decisions, then
  hands off to `/to-spec`.
- **`/diagnosing-bugs`**: hard bugs; fix with a regression test, then `/retro`.
- **`/improve-codebase-architecture`**: upkeep between milestones.

## Swarm rules of thumb

- A linear ticket chain cancels the swarm's benefit; a wide graph is the point.
- CI, lint and the determinism test (`replay(seed, log) == live`) are the gate
  that stops regressions when many agents merge. Run the gate from the repo
  root: `pnpm lint`, `pnpm typecheck` and `pnpm test` cover the app and
  `packages/engine` (lint from the root config; typecheck and test fan out
  with `pnpm -r`); an engine-only ticket can iterate with
  `pnpm --filter @investment-tycoon/engine test`.
- Tickets that touch the engine and the UI meet at the package's entry point
  (`packages/engine/src/index.ts`): export new names there, never import
  engine internals from the app.
- Every parallel agent spends its own tokens: use the swarm on M/L milestones,
  not small changes.
