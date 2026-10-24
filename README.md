# Investment Tycoon _(working title)_

A browser game about learning to invest by doing it. You start as a junior
trader on a prop-firm challenge, reading a fictional market with **Stage
Analysis** (30-week MA, volume, relative strength). You call the stage, size
the position, and protect your HP. Later you replay real historical moves
(Cisco in the dot-com era, Apple, Tesla…) as case files in your **Model Book**,
and eventually grow a firm managing outside capital.

> **Educational game.** Markets and companies are fictional, or historical
> replays. No real money is involved. Nothing in this game is financial advice.

## Status

**M0 done:** project skeleton, v3 design system, and the trading screen layout
over a real seeded weekly chart (stage-cycle generator, 30w/10w MA, volume,
Mansfield RS). Most HUD values are still placeholders. Next up is **M1: market
engine & playback**.

```bash
mise trust && mise install   # once: Node 22 from mise.toml
corepack enable              # once: pnpm at the version pinned in package.json
pnpm install
pnpm dev                     # http://localhost:5173/?seed=48213
pnpm test
```

URL params: `?seed=123` fixes the market, `?cb=1` colorblind palette,
`?nostop=1` the no-stop variant.

## Docs

| Doc                                                                                           | What's in it                                                                 |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [docs/ROADMAP.md](docs/ROADMAP.md)                                                            | Milestones, each ending in a playable, deployed build                        |
| [docs/DESIGN.md](docs/DESIGN.md)                                                              | Design decisions, pushback on the original brief, fun-risk per mode          |
| [docs/MODEL_BOOK.md](docs/MODEL_BOOK.md)                                                      | Historical case files: how they play, first candidate list, data & licensing |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                                  | Stack, data model, time structure, stage-cycle generator, save format        |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)                                                      | Hosting, local saves, accounts & cloud (later), leaderboards, privacy        |
| [design/design_handoff_investment_tycoon/](design/design_handoff_investment_tycoon/README.md) | Claude Design handoff: screens, tokens, interactions                         |

## Stack

TypeScript · Vite · React · custom SVG charts · Vitest · Cloudflare static hosting.
