# Roadmap

Small milestones. **Every milestone ends with a deployed build that someone can
open in a browser and use.** No milestone leaves the app in a broken or
half-wired state. Rationale is in [DESIGN.md](DESIGN.md), technical details in
[ARCHITECTURE.md](ARCHITECTURE.md), the historical case files in
[MODEL_BOOK.md](MODEL_BOOK.md), hosting and saves in [DEPLOYMENT.md](DEPLOYMENT.md).

**Core method: Stage Analysis (Weinstein).** The core tools are the 30-week and
10-week MAs, volume vs its average, and Mansfield RS vs the index. Timeframes are
Weekly, Daily and 65m. The player calls the stage before entering.

**Progression: the chart grows with you.** The player does not see all of
that on day one. Level 1 is a bare price line; each level adds one tool
(30w MA, stops, candles, volume, RS…) together with the concept it teaches.
See [Levels](#levels-the-chart-grows) below and DESIGN §3.

## Definition of Done (every milestone)

- [ ] Deployed to the static host; the milestone's **demo script** works on the live build
- [ ] `npm run build`, `npm run lint`, `npm test` pass in CI
- [ ] Engine changes have unit tests; determinism test (`replay(seed, log) == live`) still passes
- [ ] No dead-end UI: every visible control either works or isn't shown
- [ ] UI matches the Design canvas (`design/README.md`) where a screen exists
- [ ] `CHANGELOG.md` updated; any new concept has mentor text in `content/concepts`
- [ ] Short playtest (even solo): note one thing that felt good and one that didn't

## Overview

| Phase                                              | Milestones       | Ships as                                                               |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- |
| **0: Foundation**                                  | Pre-M0 ✅, M0 ✅ | Skeleton + design tokens + seeded weekly chart                         |
| **1: Stage Analysis Challenge** (generated market) | M1–M7            | **M4 = first playable → v1.0 (M7)**                                    |
| **2: Model Book** (real historical stocks)         | M8–M11           | **v2.0**: case files (CSCO, AAPL, TSLA…) + historical market replays   |
| **3: Fundamentals & Firm**                         | M12–M15          | v3.0: earnings/fundamentals, clients/AUM                               |
| **4: Automation**                                  | M16–M17          | v4.0: strategy builder + backtester (on generated and Model Book data) |
| **C: Cloud** (optional, after v1.0)                | C1–C2            | accounts, cloud save, leaderboards                                     |

Estimates assume one developer working part-time; with Claude writing the code
they shrink a lot and playtesting becomes the bottleneck. **S** ≈ a few evenings ·
**M** ≈ 1–2 weeks · **L** ≈ 2–3 weeks.

## Levels: the chart grows

RPG-style progression for Phase 1. Every level unlocks **one** tool on the
chart or in the loadout, and the concept that goes with it. The UI mockups are
in the Design canvas (see `design/README.md`).

| Lv  | Rank             | Unlocks                                                | Teaches                     | Trial to level up                              |
| --- | ---------------- | ------------------------------------------------------ | --------------------------- | ---------------------------------------------- |
| 1   | Rookie           | Weekly **price line**, 1 ticker, market Buy/Sell       | trend, P&L                  | Hold one winner for 6+ weeks                   |
| 2   | Apprentice       | **30w MA** + **Call the Stage** cards                  | Stage 1–4, the stage line   | 3 correct stage calls in a row                 |
| 3   | Junior Trader    | **Stop, target, sizing** (Loadout), R-multiples        | stop-loss, position size, R | 5 trades with risk ≤ 1% and the stop respected |
| 4   | Trader           | **Candles** (OHLC); stops now fill intra-bar, gaps     | wicks, gaps, slippage       | Pass a Phase 1 challenge                       |
| 5   | Senior Trader    | **Volume** + 10w average volume                        | breakout confirmation       | Buy 2 breakouts on ≥ 2× volume                 |
| 6   | Stage Analyst    | **10w MA** + **Mansfield RS**; full setup rating (4/4) | relative strength           | 3 entries rated 4/4                            |
| 7   | Portfolio Trader | Watchlist (all 12), **short**, **Daily** timeframe     | selection, short selling    | A profitable Stage 4 short; pass Phase 2       |
| 8   | Pro              | **65m**, Sector RS, Breadth, stage alerts              | timing, market context      | (Funded track, M7)                             |

Rules:

- **The engine doesn't change.** The market always generates full OHLCV,
  MAs and RS (same seed, same market). Levels only gate what the player _sees_
  and which orders they can place.
- **Trials gate the level-up; XP fills the bar.** XP alone never levels you
  up, so there's no grinding: you prove the skill the next tool depends on.
- **No candles, no intra-bar stops.** Below Lv4 stops fill on the weekly
  close, so a stop never triggers on a low the player can't see. The Lv4
  unlock _is_ the lesson: "in reality your stop gets hit by the wick".
- **The setup checklist grows too:** Lv2 shows only "above 30w MA" and "30w MA
  rising"; volume joins at Lv5, RS at Lv6.
- **Challenge rules scale with level.** Lv1–2 have only the −10% total limit;
  the −5% daily limit arrives with stops at Lv3.
- **Locked tools are teased:** dashed chip with a padlock and "Lv N".
- **Placement test** for people who already know Weinstein: a short quiz that
  can skip straight to Lv4 or Lv6. A dev flag `?level=` overrides everything.

---

## Phase 0: Foundation

### Pre-M0: UI mockup · S · ✅ done

Claude Design handoff in `design/design_handoff_investment_tycoon/`. The approved
direction is **01 Trading Screen v3 (game HUD)**. All screens have since been
rebuilt in v3 on the Design canvas (`design/README.md`), plus the Lv1 Rookie
screen, the level ladder and the Challenge Passed screen.

### M0: Project skeleton & design system · S · ✅ done

**Goal:** a deployed app with the engine/UI split and the v3 look in place.

- Vite + React + TS (strict), ESLint, Prettier, Vitest; folders as in ARCHITECTURE §1
- CI (GitHub Actions) → Cloudflare: preview URL per branch, production from `main`
- **v3 design tokens** as CSS variables (incl. `--up`/`--down` colorblind swap, `prefers-reduced-motion`); fonts Chakra Petch / Inter / JetBrains Mono
- Static **layout shell of screen 01** (HUD row, mission/HP row, chart card, bottom row, loadout column) with placeholder data
- Seeded PRNG; a pre-generated **weekly** chart with 30w/10w MA in the chart card
- **Chart decision:** custom SVG (ARCHITECTURE §1.1), chosen over lightweight-charts v5 for the design's overlays
- `APP_VERSION` / `ENGINE_VERSION` + disclaimer in the footer

**Demo:** the production URL shows screen 01's layout with a real seeded weekly chart; `?seed=` changes the chart; a branch push gives a preview URL.

---

## Phase 1: Stage Analysis Challenge (v1)

### M1: Market engine & playback · M

**Goal:** a living fictional market with real stage cycles.

- Clock: 65m bar (base) → day (6 bars) → week (5 days); playback ❚❚ / 1× / 2× / 5× / NEXT DAY
- **TYX index + 12 fictional stocks**; stocks = beta × index + an idiosyncratic **stage cycle** (1 Base → 2 Advance → 3 Top → 4 Decline), with stage-specific drift, volatility and volume signatures (breakout volume spike, distribution volume)
- ~2 years of warm-up history before the challenge starts (needed for the 30w MA and 52w RS)
- Aggregation 65m → D → W; studies: MA 10w/30w, avg volume 10w, **Mansfield RS**
- Timeframe chips W / D / 65m; ticker switcher (a minimal watchlist)
- Dev-only overlay of the hidden stages (for tuning)
- Chart layers split by level (price line / 30w MA / candles / volume / 10w MA + RS), with a dev `?level=` switch; the default view is Lv1

**Demo:** press play and watch weeks unfold; bases form, some break out on volume, leaders top and roll over. Switch W/D/65m and switch tickers. `?level=1` shows only the price line, `?level=6` the full chart.
**Teaches:** _stage analysis_, _30-week MA_, _relative strength_, _volume confirmation_.

### M2: Trading & accounting · M

**Goal:** a sandbox where you can buy, sell and short across the universe.

- Market orders with spread; long/short; multiple positions across tickers
- Account: balance, equity, open P&L, in integer cents; bankroll widget
- Active position card; battle-log table (without XP/flags yet)
- Keyboard: B / S / F, Space, 1/2/5

**Demo:** buy KRVX, watch the open P&L, switch to OMNX, short it, flatten both; trades appear in the log.
**Teaches:** _long_, _short selling_, _spread_, _realized vs unrealized P&L_.

### M3: Loadout: stops, targets & sizing · M

**Goal:** every trade has defined risk.

- Stop/limit orders, brackets (stop + target, OCO); intra-bar matching on the substep path; gap-through fills
- **Loadout panel**: risk % meter (0.5–2.5%), stop/target tiles, size = floor(equity × risk% / |entry − stop|), "if stopped out −$X"
- **Draggable** stop/target lines on the chart, updating the loadout live; player-drawn resistance line
- Profit/risk zones and R tags on the chart; **NO SHIELD** variant when there's no stop
- Stop fill mode by level: on the weekly close below Lv4 (no candles visible), intra-bar from Lv4

**Demo:** set 1% risk, drag the stop under the base, see size update; get stopped for exactly −1R; a gap through the stop fills worse and is explained.
**Teaches:** _stop-loss_, _position sizing_, _R-multiple_, _slippage_, _gap risk_.

### M4: The Challenge · M · ⭐ first playable

**Goal:** a real game with a win and a loss condition.

- Rules: $100k, +10% target, −5% daily, −10% total, 4–10 weeks
- **Mission bar + Daily HP + Account HP** with all states (safe / warning / critical / breached), week pips
- **Briefing screen (03)** with v3 treatment; seed random/custom
- Breach → liquidate → basic fail screen; target after min weeks → basic pass screen; retry with new seed
- **Levels framework**: the run starts at the player's level, tools are gated per the [Levels](#levels-the-chart-grows) table, rules scale with level; trials for Lv1→2 and Lv2→3; a level-up screen that shows the new tool

**Demo:** a stranger opens the link, reads the briefing, plays ~10 min at Lv1 with only the price line, passes or fails with a clear reason, and hits retry. Holding a winner for 6 weeks levels them up and the 30w MA appears.
**Teaches:** _drawdown_, _daily loss limit_, _prop firm_.

### M5: Stage call & post-mortem · M

**Goal:** the method becomes the gameplay, and losing teaches.

- **Call the Stage** cards (Lv2+, required before Buy); setup rating from the 4 checks + checklist, with checks shown only once their tool is unlocked
- No-look-ahead **stage classifier** to score calls fairly; hidden true stages revealed after the run
- Behavior detectors: `no-stop`, `oversized`, `stop-widened`, `revenge-trade`, `stage4-buy`, `rs-negative-entry`, `averaging-down`
- **Challenge Failed screen (02)** with v3 treatment: causal chain, equity curve with stage bands, stats grid, replay
- Challenge Passed screen (design it first; it's an open item in the handoff)

**Demo:** buy a Stage 4 bounce at 3× size after a loss; the post-mortem shows the chain, the stage bands, and the concepts to learn.
**Teaches:** _Stage 1–4_, _revenge trading_, _expectancy_, _never buy Stage 4_.

### M6: Game layer: XP, quests, mentor · M

**Goal:** reward the process, not the P&L.

- XP for process only (followed plan, stop respected, right stage call, quest done); rank badge and XP bar
- Trials for every level up to Lv6 (XP fills the bar, the trial unlocks the level); placement test to skip ahead
- Side quests (e.g. "Risk ≤ 1% on 5 trades", "No Stage 4 buys this week"); discipline streak
- Battle log with flag chips and XP per trade
- **Mentor Margo**: rule-based triggers, underlined terms → short lessons, "Teach me · +XP"; terms-learned log
- Floating XP toasts and animations; reduced-motion respected

**Demo:** a disciplined losing trade earns more XP than a lucky, undisciplined winner, and the mentor explains why.
**Teaches:** makes every concept from M1–M5 discoverable.

### M7: Career, unlocks & persistence · M · ⭐ v1.0

**Goal:** a reason to come back.

- Career: Phase 1 → Phase 2 → Phase 3 → Funded; stricter rules per phase
- **Lv7–8 unlocks**: full watchlist, short, Daily, then 65m, Sector RS, Breadth (% > 30w MA), stage alerts; level and trials persisted
- `SaveStore` over localStorage, autosave, `storage.persist()`, **export/import JSON**, versioned saves
- Daily seed challenge; settings (colorblind, sound, reduced motion, speed)

**Demo:** close the tab mid-career, reopen, continue at the same level. Reach Lv8 and Sector RS appears as a new panel.

> **v1.0 checkpoint:** playtest with 3–5 people. Do they retry after failing? Can they explain why they failed? Can they call a Stage 2 breakout?

---

## Phase 2: Model Book (v2)

Real historical stocks, played as "case files". Details in [MODEL_BOOK.md](MODEL_BOOK.md).

### M8: Historical data pipeline · M

**Goal:** real, clean price data in the game's format.

- `scripts/fetch-case` : daily OHLCV (split-adjusted) for a ticker + its benchmark index, from the chosen provider
- Validation (gaps, splits, bad ticks), weekly aggregation, compact JSON output in `content/casefiles/data/`
- Case-file schema + validator (`npm run casefile:check`)
- **Private build flag**: real-data content is excluded from the public build until licensing is resolved (MODEL_BOOK §5)

**Demo:** `npm run fetch-case CSCO 1995-01-01 2003-12-31` → the data renders in the game's chart with 30w MA and RS vs the index.

### M9: Case File mode · M

**Goal:** replay a historical stock's life, week by week.

- Turn-based weekly replay (advance one week / autoplay), daily drill-down for entry timing
- **Blind mode** (default): ticker, name and dates hidden, prices rebased; **Open mode** for study
- Same loadout, stage call and HP rules as the challenge
- Scoring: % of the move captured, max drawdown, stage-call accuracy, and comparison with a **rules bot** (textbook Weinstein entries/exits) and buy-and-hold
- **Reveal screen**: "This was Cisco, 1998–2002", with story, key dates, and your trades on the real chart

**Demo:** play an unnamed case, get stopped out of the top, ride or miss the Stage 2; the reveal shows it was Cisco and how the rules bot did.
**Teaches:** _stage cycle on real data_, _climax top_, _hindsight bias_.

### M10: The Model Book · M

**Goal:** a collection that teaches, and your own cases.

- First 10–12 case files, **winners and failures** mixed (see MODEL_BOOK §3)
- Model Book screen: collected cases, your annotated charts, lessons tagged per case
- Annotation tools: mark base, breakout, top, breakdown on the chart
- **Suggest a case**: JSON/Markdown template + validator, so you (or players later) can add cases

**Demo:** complete 3 cases, open the Model Book, compare your annotations with the reference ones; add a new case from the template.

### M11: Historical market replays · L · ⭐ v2.0

**Goal:** relive market-wide moments.

- Index-level data for 1929, 1987, 2000, 2008, 2020 (MODEL_BOOK §5 for sources)
- Market-level stage analysis: index stage, breadth, "should you even be long?"
- Period revealed at the end

**Demo:** play an unnamed period, survive (or not); the reveal says "October 1987".
**Teaches:** _market stage_, _breadth_, _crash_, _bubble_.

---

## Phase 3: Fundamentals & Firm (v3)

### M12: Earnings & fundamentals card · M

Proposed in the design handoff as a Phase 2 unlock. Company card with EPS/revenue growth, earnings events with gaps, fundamental checks added to the setup rating (CAN SLIM-style). Works on generated stocks; later on case files.
**Teaches:** _EPS growth_, _earnings surprise_, _guidance_.

### M13: Research & statements · L

Generated companies with consistent statements, research-hours budget, ratios, red flags and value traps (DESIGN §1.3–1.4).
**Teaches:** _P/E_, _ROE_, _debt/equity_, _free cash flow_, _value trap_.

### M14: Clients & AUM · L

Open your fund with career capital; clients with benchmark, risk tolerance and patience; fees; first analyst hire (runs a saved stage scan). Firm screen.
**Teaches:** _AUM_, _fees_, _redemptions_, _career risk_.

### M15: News & sector rotation layer · M

Shared event bus: earnings seasons, sector rotation, headlines. Sector RS becomes a gameplay lever.
**Teaches:** _sector rotation_, _priced in_.

(Macro/portfolio mode stays in the parking lot until the event layer exists; see DESIGN §4.)

---

## Phase 4: Automation (v4)

### M16: Strategy builder · L

Node editor (conditions → logic → actions → sizing), e.g. "30w MA rising AND breakout volume ≥ 2× AND RS > 0 → buy 1% risk, stop under base". Staff can run graphs.

### M17: Backtester & overfitting lesson · M

Backtest on many generated seeds **and on Model Book data**. Mandatory in-sample / out-of-sample split; the game points out when a strategy that looks great in-sample fails out of sample.
**Teaches:** _backtesting_, _overfitting_, _survivorship bias_.

---

## Track C: Cloud (optional, any time after v1.0)

Details in [DEPLOYMENT.md](DEPLOYMENT.md) §3.

### C1: Accounts & cloud save · M

Supabase (EU region): anonymous-first auth, magic link + Google/GitHub, `saves` table with RLS, `CloudSaveStore` adapter, revision-based conflict prompt, offline cache. Privacy policy + "delete my account".
**Demo:** play anonymously, sign in, continue on another device.

### C2: Daily-seed leaderboards · M

Client submits seed + command log; an Edge Function replays it with the same engine and records the score.
**Demo:** a tampered log is rejected; the board shows the server-computed score.

---

## Parking lot (not scheduled)

- Macro/portfolio mode (factor model, correlation puzzles); highest fun risk (DESIGN §4)
- Market impact / liquidity at high AUM
- Options desk
- Localization (Italian first?)
- Mobile layout (desktop-first until v2)
