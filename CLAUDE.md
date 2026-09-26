# Investment Tycoon

Educational browser game: Stage Analysis (Weinstein) trading on a generated
market, later historical case files. Plan and rationale live in `docs/`
(start with `docs/ROADMAP.md`); the UI spec is the Claude Design handoff in
`design/design_handoff_investment_tycoon/README.md`.

## Commands

- `npm run dev`: dev server (http://localhost:5173/?seed=48213)
- `npm test`, `npm run lint`, `npm run typecheck`, `npm run format`
- `npm run build`: typecheck + production build to `dist/`

## Rules

- `src/engine/` is pure, deterministic TypeScript: no React, no DOM, no
  `Math.random()` (use `engine/rng.ts` streams). ESLint enforces this.
- Same seed → same market, regardless of player actions (separate RNG streams).
- Money in the engine will be integer cents from M2 on.
- UI values come from the design tokens in `src/ui/theme/tokens.css`; match the
  handoff's numbers when a screen exists. Always pair P&L color with a sign/arrow.
- Every milestone ends deployable; see the Definition of Done in `docs/ROADMAP.md`.
- In this Windows setup, avoid `cd` in Bash (an fnm hook fails); the working
  directory is already the repo root.
