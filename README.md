# Investment Tycoon *(working title)*

A browser game about learning to invest by doing it. You start as a junior
trader on a prop-firm challenge, reading a fictional market with **Stage
Analysis** (30-week MA, volume, relative strength). You call the stage, size
the position, and protect your HP. Later you replay real historical moves
(Cisco in the dot-com era, Apple, Tesla…) as case files in your **Model Book**,
and eventually grow a firm managing outside capital.

> **Educational game.** Markets and companies are fictional, or historical
> replays. No real money is involved. Nothing in this game is financial advice.

## Status

Planning and UI design done. Next up is **M0: project skeleton & design system**.

## Docs

| Doc | What's in it |
|---|---|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Milestones, each ending in a playable, deployed build |
| [docs/DESIGN.md](docs/DESIGN.md) | Design decisions, pushback on the original brief, fun-risk per mode |
| [docs/MODEL_BOOK.md](docs/MODEL_BOOK.md) | Historical case files: how they play, first candidate list, data & licensing |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, time structure, stage-cycle generator, save format |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting, local saves, accounts & cloud (later), leaderboards, privacy |
| [design/design_handoff_investment_tycoon/](design/design_handoff_investment_tycoon/README.md) | Claude Design handoff: screens, tokens, interactions |

## Planned stack

TypeScript · Vite · React · Zustand · Vitest · Cloudflare static hosting.
Chart layer (lightweight-charts vs custom SVG/canvas) is decided in M0.
