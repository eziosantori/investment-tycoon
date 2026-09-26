# Changelog

## M0: Project skeleton & design system (2026-09-26)

- Vite + React 19 + TypeScript (strict), ESLint, Prettier, Vitest; GitHub Actions CI
  (format, lint, typecheck, test, build); Cloudflare Workers static-assets config.
- v3 "game HUD" design tokens as CSS variables, colorblind palette (`?cb=1`),
  `prefers-reduced-motion` support; Chakra Petch / Inter / JetBrains Mono.
- Engine: seeded PRNG with independent named streams; stage-cycle market
  generator (TYX index + one stock, daily bars aggregated to weekly); studies:
  MA 10w/30w, avg volume 10w, Mansfield RS, 30w slope.
- Screen 01 layout shell: HUD, mission/HP bars, chart card, mentor, battle log,
  side quests, stage call, loadout, active position. The chart is real and
  seeded (`?seed=`); stage call and MA/VOL/RS toggles work; most other values
  are placeholders from the design handoff. `?nostop=1` shows the no-stop variant.
- Chart decision: custom SVG (docs/ARCHITECTURE.md §1.1).

**Teaches:** nothing yet (infrastructure).
