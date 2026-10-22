# Design

**Current source: the Design canvas on claude.ai**
<https://claude.ai/artifact/PpbrPKvKCQ1txZBUEvaFbE> (private; share it from the
page's Share menu).

| Artboard                         | What it shows                                                     |
| -------------------------------- | ----------------------------------------------------------------- |
| 01 Trading · Lv6 Stage Analyst   | Full trading screen (was handoff 01 v3); D/65m, short, Sector, Breadth locked |
| 01a Trading · Lv1 Rookie         | Day-one screen: price line only, Buy/Sell, Lv2 trial, locked tools |
| 04 Levels · the chart grows      | The 8-level ladder with a mini chart per level (tweak `current`)  |
| 03 Challenge briefing            | v3 treatment; tweak `rookie` switches Lv1 / Lv6 rules             |
| 02 Challenge failed              | v3 post-mortem: HP 0, XP kept, causal chain, stage bands          |
| 02b Challenge passed · level up  | New: pass screen + Lv4 unlock (line vs candles, the wick lesson)  |
| 05 Design tokens · v3            | Token sheet matching `src/ui/theme/tokens.css`                    |

The level ladder and its rules live in `docs/ROADMAP.md`, "Levels: the chart grows".

`design_handoff_investment_tycoon/` is the original Claude Design handoff (M0).
Its README still holds the pixel specs, interactions and state model for screen
01; where it disagrees with the canvas (screens 02–05, locks, levels), the
canvas wins.
