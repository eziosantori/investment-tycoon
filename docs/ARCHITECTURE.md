# Architecture

Technical foundation for the game. Design rationale is in [DESIGN.md](DESIGN.md);
delivery order is in [ROADMAP.md](ROADMAP.md).

---

## 1. Stack

| Concern         | Choice                                                                | Why                                                                               |
| --------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Language        | **TypeScript** (strict)                                               | The data model is the heart of the game, so types matter.                         |
| Build           | **Vite**                                                              | Fast dev server, static output.                                                   |
| UI              | **React**                                                             | Panel-based dashboard UI; large ecosystem.                                        |
| UI state        | **Zustand** (from M1)                                                 | Small store that subscribes to engine snapshots; no boilerplate.                  |
| Charts          | **Custom SVG** (`src/ui/components/chart/`), decided in M0 (see §1.1) | Pixel control over the design's overlays; bar counts are small.                   |
| Other charts    | Same SVG approach (equity curve, sparklines)                          | Keep the bundle lean.                                                             |
| Tests           | **Vitest**                                                            | Same config as Vite; the engine is pure TS, so it's easy to test.                 |
| Persistence     | `SaveStore` adapter: `localStorage` → IndexedDB → cloud               | No backend until leaderboards or cloud saves. See [DEPLOYMENT.md](DEPLOYMENT.md). |
| Hosting         | Cloudflare (static), preview per branch                               | Zero ops cost. See [DEPLOYMENT.md](DEPLOYMENT.md).                                |
| Backend (later) | Supabase (auth + Postgres + Edge Functions)                           | Only for Track C (cloud save, leaderboards).                                      |

### 1.1 Chart decision (M0)

**Custom SVG, rendered at the container's real pixel size** (measured with a
`ResizeObserver`, so text stays crisp and nothing stretches). Chosen over
lightweight-charts v5 because the design leans on overlays that are awkward in
a charting library: tag pills on the price axis, profit/risk zones, the base
box, volume badges, HUD brackets, and a Mansfield RS pane with above/below-zero
fills. Bar counts are small (≈108 weekly bars visible; daily/65m will render
only the visible window), so SVG performance isn't a concern.

Revisit if pan/zoom and crosshair on long 65m histories (M1+) get heavy: the
fallback is a `<canvas>` layer for candles with the SVG overlays on top.

**Core rule: the simulation engine is framework-free TypeScript**, in the
workspace package `packages/engine` (`@investment-tycoon/engine`,
[ADR-0003](adr/0003-engine-as-workspace-package.md)), with no React imports and
no DOM access. The UI only reads snapshots and sends commands. This keeps the
engine testable, deterministic, and movable into a Web Worker (or a replay
server) later. The app consumes it as TypeScript source through one entry point
(`src/index.ts`); ESLint forbids deep imports, and the package's tsconfig has no
DOM types. pnpm workspaces, no Turborepo
([ADR-0004](adr/0004-pnpm-workspaces-without-turborepo.md)): root `test` and
`typecheck` run the app, then each package via `pnpm -r`.

```
packages/engine/src/
  index.ts       the public surface the app imports
  universe.ts    the market universe (TYX + 12 stocks): it decides a seed's market
  rng, cursor, studies, version, market/ (generation, calendar), chart/ (views)
src/             the web app
  content/       UI content: rulesets, concepts (advisor text), scenarios
  game/          game loop, save/load, command dispatch, engine ↔ store bridge
  ui/            React components, panels, theme
  test/          shared fixtures
```

---

## 2. Determinism

Every run comes from a **seed**. This gives us:

- reproducible bugs ("seed 48213, bar 412"),
- "daily challenge" seeds that everyone plays,
- replays of a blown account for the post-mortem,
- saves that store only `seed + command log` (event sourcing), with snapshots
  for fast loading.

Rules:

- Seeded PRNG (e.g. `sfc32` / `mulberry32`). `Math.random()` is banned in `packages/engine`.
- **Separate RNG streams** per subsystem (`market`, `events`, `companies`, ...),
  so a player action can never change what the market does. Same seed means the
  same market, whatever the player does.
- v1 has **no market impact**: player orders don't move prices. (It could come
  back later for large AUM as a scaling challenge.)
- Money is stored as **integer minor units** (cents). Prices are rounded to the
  instrument's tick size when generated. No floating-point drift in P&L.

---

## 3. Time & tick structure

### 3.1 Units of time

| Unit        | Sim meaning                                | Used for                                             |
| ----------- | ------------------------------------------ | ---------------------------------------------------- |
| **substep** | 1/12 of a bar                              | Price path inside a bar; order matching              |
| **bar**     | 65 sim-minutes (base unit)                 | 65m candles; aggregated to D and W                   |
| **day**     | 6 bars (6 × 65m = 390 min, one US session) | Daily HP reset at the open, overnight gap, D candles |
| **week**    | 5 days = 30 bars                           | W candles, 30w/10w MA, Mansfield RS, stage cycle     |
| **turn**    | 1 week                                     | Model Book case files (real data, turn-based)        |
| **quarter** | ~13 weeks                                  | Earnings, client reviews, fees (Phase 3)             |

Default speed: **1 bar/sec**, so a day ≈ 6 s, a week ≈ 30 s, and a 10-week
challenge ≈ 5 min of pure playback, or 10–15 min with pauses. Speeds: pause /
1× / 2× / 5× / "next day".

Model Book case files use real **daily** data only (no free intraday history),
so they run week by week as turns, with daily drill-down.

### 3.1b Studies (Stage Analysis)

| Study          | Definition                                                             |
| -------------- | ---------------------------------------------------------------------- |
| MA 30w / 10w   | Simple MA of weekly closes                                             |
| Avg volume 10w | Simple MA of weekly volume; breakout volume = week volume / avg        |
| Mansfield RS   | `(ratio / SMA52w(ratio) − 1) × 10`, where `ratio = close / indexClose` |
| 30w slope      | Change of the 30w MA over 4 weeks (the "rising/falling" arrow)         |
| Setup checks   | price > 30w MA · 30w slope > 0 · breakout volume ≥ 2× · RS > 0         |

The 52-week RS needs history, so every run starts with **160 weeks of warm-up**
already generated: the 108 weeks visible on the W chart, plus 52 so that all of
them have a valid RS.

**No-look-ahead stage classifier:** a rule-based function of the data up to week
_t_ (30w MA slope, price vs MA, recent range, RS). It scores the player's stage
calls fairly, powers the rules bot, and powers the stage scanner. The
generator's hidden stage is a different thing: it's the ground truth revealed in
the post-mortem.

### 3.2 Why substeps

A bar is generated as a path of substeps, not just OHLC. That means order
matching knows _the order in which prices happened inside the bar_. So if a stop
and a target are both inside one bar's range, we know which was hit first. No
"assume worst case" guessing. The chart only shows OHLC; the engine uses the path.
M2 has only market orders, which fill at the bar at the cursor, so it does not
walk substeps; matching working orders over substeps arrives in M3, inside
`advanceTo` (§3.3).

### 3.3 The run reducer

The market is a precomputed timeline, read-only for the whole run
([ADR-0001](adr/0001-precomputed-market-timeline.md)): nothing is generated while
playing. The run state (cursor, cash, positions, trades, id counters, settings)
is a plain serializable object that does not hold the market. It changes only
through two pure functions over the timeline
([ADR-0005](adr/0005-run-reducer-advance-and-apply.md)); each returns the new
state plus the events it produced:

```ts
function advanceTo(state: RunState, timeline: Timeline, bar: number): RunResult;
function apply(state: RunState, timeline: Timeline, command: Command): RunResult;
// RunResult = { state: RunState; events: RunEvent[] }
```

- **`advanceTo`** moves the cursor forward to `bar`, clamped to the end of the
  timeline. Positions are valued at the mid (the close of the bar at the cursor)
  whenever they are read, so nothing is stored per bar. In M3 this is also where
  working orders (stop, limit, brackets) are matched on every bar and substep the
  cursor crosses, and where gaps fill at the gap price; M2 has no working orders.
- **`apply`** applies one player command at the current cursor. M2 commands:
  market order (ticker, buy or sell, shares) and flatten (ticker). Each is
  validated, then filled at the ask (buy) or bid (sell) of the bar at the cursor.
- **Events:** fills, trade opened / closed, and refusals with a typed reason:
  `insufficientBuyingPower`, `shortNotAllowed`, `crossesZero`, `marketEnded`,
  `notTradable` (malformed commands, such as non-positive shares, are refused
  too). A refused command leaves the state unchanged apart from the event.
- **Replay** is a fold of the command log over a fresh run: for each command,
  `advanceTo(command.at)` then `apply(command)`; finally `advanceTo(finalCursor)`.
  The determinism test asserts that `replay(seed, log)` deep-equals the live state.

Mark-to-market is a derived read of the state against the timeline, not a step:
equity = cash + Σ shares × mid. Rule evaluation (prop limits, liquidation) and
the behavior detectors (§4.6) arrive in M4 and M5 as further readers of the same
state and events; nothing in M2 evaluates rules.

### 3.4 Game loop (UI side)

```
requestAnimationFrame → accumulate real time × speed
  → engine.advanceTo(run, timeline, bar)         (the cursor lives in the run)
  → publish the new run state to the Zustand store (throttled to frame rate)
  → React renders the panels that subscribe to changed slices
```

The UI store keeps the run state and its command log, plus speed, pause, selected
ticker, timeframe and level. A player action is a command: the store applies it
with `apply`, which returns the new state, and appends it to the command log
stamped with the bar it was issued at. The UI never mutates accounting directly,
and the playback loop writes nothing to the log. Trading works while the market
plays, with no pause.

---

## 4. Core data model

Plain serializable objects (no classes, no `Map`s in saved state), so a save is
just `JSON.stringify`.

### 4.1 Market

```ts
type InstrumentId = string;

interface Instrument {
  id: InstrumentId;
  symbol: string; // fictional ticker, e.g. "KRVX"
  name: string;
  kind: 'equity' | 'index' | 'fx' | 'commodity' | 'bond';
  tickSize: number; // e.g. 0.01
  contractSize: number; // 1 for shares; >1 for futures-like instruments
  sector?: SectorId;
  companyId?: CompanyId; // value desk: link to fundamentals
}

interface Bar {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface InstrumentState {
  price: number;
  bars: Bar[]; // closed bars (ring buffer in memory, trimmed in saves)
  forming: Bar; // current bar being built
  hidden: {
    // never shown to the player; revealed in the post-mortem
    regime: RegimeId;
    vol: number; // current volatility state (GARCH-like)
    anchor: number; // mean-reversion anchor / fair value
  };
}

interface MarketState {
  clock: Clock;
  instruments: Record<InstrumentId, Instrument>;
  states: Record<InstrumentId, InstrumentState>;
  factors?: FactorState; // macro (parked): rates, usd, oil, growth, risk appetite
}

interface Clock {
  substep: number;
  bar: number;
  session: number;
  quarter: number;
}
```

### 4.2 Orders, positions, account

As built in M2. Prices and money are integer cents, shares are integers; the
average price is a derived float for display. Terms follow GLOSSARY.md.

```ts
type Side = 'buy' | 'sell';

// A stock of the universe carries a spread in basis points (about 5-15, wider on
// small, volatile names). The index has none and is not tradable.
interface Quote {
  mid: number; // close of the bar at the cursor
  bid: number; // mid - half spread, rounded down, at least 1 cent below mid
  ask: number; // mid + half spread, rounded up, at least 1 cent above mid
}

// Player commands, stamped with the bar they were issued at. Time advances are
// never logged. No fee, no margin, no leverage.
type Command =
  | { type: 'marketOrder'; at: number; ticker: string; side: Side; shares: number }
  | { type: 'flatten'; at: number; ticker: string };

interface Fill {
  id: number; // sequential counter, never random or wall-clock
  tradeId: number;
  ticker: string;
  side: Side;
  shares: number;
  price: number; // ask for a buy, bid for a sell
  at: number; // bar
}

interface Position {
  ticker: string;
  shares: number; // signed: > 0 long, < 0 short; at most one per stock
  costBasis: number; // integer cents, not an average price
  openedAt: number;
}

interface Trade {
  // a round trip in one stock, from flat back to flat
  id: number;
  ticker: string;
  side: 'long' | 'short';
  fills: Fill[]; // adding and trimming stay in the same trade
  openedAt: number;
  closedAt?: number; // absent while the trade is open
  realizedPnl: number; // integer cents; settled as the position shrinks
}
// Entry and exit prices of a trade are derived: the volume-weighted prices of
// its opening and closing fills.

interface RunSettings {
  startingBalance: number; // $100,000 = 10_000_000 cents
  shortAllowed: boolean; // derived by the app from the level (Lv7+); the engine knows no levels
}

interface RunState {
  cursor: number;
  cash: number; // buys subtract; sells and short sale proceeds add
  positions: Position[];
  trades: Trade[]; // open and closed
  nextFillId: number;
  nextTradeId: number;
  settings: RunSettings;
}
```

Rules:

- **Fills:** a market order fills immediately at the ask (buy) or the bid (sell)
  of the bar at the cursor; rounding always goes against the player. The spread
  is the only cost of trading.
- **Positions:** orders in the same direction add to the position; opposite
  orders shrink it. An order that would take it past zero is refused
  (`crossesZero`): there is no flip in one order.
- **Cost basis:** on a partial close the removed basis is
  `floor(costBasis × closedShares / shares)`; the remainder stays with the
  remaining shares. Realized P&L is an integer and its sum over a run is exact.
- **Equity** = cash + Σ shares × mid (a short is a liability). **Open P&L** =
  Σ (shares × mid − costBasis), signed. Equity − starting balance = realized P&L
  plus open P&L, to the cent.
- **Buying power:** exposure = Σ |shares| × mid; an order is refused
  (`insufficientBuyingPower`) if exposure after the fill would exceed equity.
  Short proceeds do not add buying power. No margin, leverage, interest or
  borrow fee.
- **Shorting:** opening or adding to a short is refused (`shortNotAllowed`) when
  `settings.shortAllowed` is false.
- **End of market:** after the last bar every order is refused (`marketEnded`);
  positions stay open and keep being valued at the final mid. No auto-flatten
  (a Challenge rule, M4).

Coming in M3: stop and limit orders, brackets and OCO groups, working-order
matching inside `advanceTo`, the initial stop captured at entry, and the
R-multiple (`riskAtEntry`, `rMultiple`). Coming in M4: the account's high-water
mark, the session baseline for the daily loss, and liquidation. Coming in M5:
the regime at entry and the behavior flags on a trade.

### 4.3 Run & rules (prop challenge)

M2 has the `RunState` of §4.2 and nothing else. The rule set and the run status
below are the M4 design; they will wrap the run state, not replace it.

```ts
interface RuleSet {
  id: string; // e.g. "phase1-standard"
  profitTargetPct: number; // e.g. 10
  maxDailyLossPct: number; // e.g. 5, measured from the session start equity
  maxTotalLossPct: number; // e.g. 10, from startingBalance (or trailing HWM)
  trailingDrawdown: boolean;
  minTradingSessions: number;
  maxSessions: number;
  allowedInstruments: string[];
}

interface Run {
  // M4
  id: string;
  seed: number;
  mode: 'prop' | 'value' | 'macro' | 'sandbox' | 'backtest';
  ruleSet?: RuleSet;
  status: 'active' | 'passed' | 'failed';
  failure?: { rule: string; at: number; detail: string };
  state: RunState;
  commandLog: Command[]; // enough to replay the run from its seed
}
```

---

### 4.4 Player progression (persists across runs)

```ts
interface Profile {
  version: number;
  careerStage: 'retail' | 'challenge' | 'funded' | 'scaling' | 'fund' | 'multi-desk';
  capital: number; // funded / firm capital
  reputation: number; // 0–100, drives client inflows later
  unlocks: UnlockId[]; // indicators, order types, panels, desks, analysts
  knownConcepts: Record<ConceptId, { firstSeenAt: string; runId: string }>;
  stats: LifetimeStats; // runs, passes, best expectancy, etc.
  settings: Settings; // speed, colorblind palette, sound
}
```

### 4.5 Firm (M14+)

```ts
interface Firm {
  aum: number;
  cashBudget: number; // from management/performance fees
  clients: Client[];
  staff: Staff[];
  desks: DeskId[];
}

interface Client {
  id: string;
  name: string;
  capital: number;
  benchmark: 'index' | 'cash+x' | 'balanced';
  riskTolerance: number; // max drawdown before they get nervous
  patience: number; // quarters of underperformance before redeeming
  satisfaction: number;
}

interface Staff {
  id: string;
  role: 'analyst' | 'trader' | 'quant' | 'risk';
  skill: number;
  salary: number;
  rules?: StrategyGraph; // what this person automates (links to the builder)
}
```

### 4.6 Events, concepts, advisor

```ts
// M2 emits fill, tradeOpened / tradeClosed and refused; the rest arrive later.
type GameEvent =
  | { type: 'fill'; fill: Fill }
  | { type: 'tradeOpened' | 'tradeClosed'; tradeId: number }
  | { type: 'refused'; reason: RefusalReason } // typed refusal of a command
  | { type: 'ruleBreach'; rule: string; detail: string }
  | { type: 'conceptUsed'; conceptId: ConceptId } // drives first-use explanations
  | { type: 'behaviorFlag'; flag: BehaviorFlagId; tradeId?: string; detail: string }
  | { type: 'news'; headline: string; instrumentIds: InstrumentId[] }
  | { type: 'sessionEnd' | 'quarterEnd'; index: number };

type RefusalReason =
  'insufficientBuyingPower' | 'shortNotAllowed' | 'crossesZero' | 'marketEnded' | 'notTradable';

interface Concept {
  // content/concepts/*.ts
  id: ConceptId; // 'stop-loss', 'position-sizing', 'pe-ratio', ...
  term: string;
  short: string; // one line, shown on first use and in tooltips
  long: string; // a paragraph, shown when clicked
  related: ConceptId[];
}
```

**Behavior detectors** (pure functions over recent run history, v1 set):

| Detector                  | Fires when                                              |
| ------------------------- | ------------------------------------------------------- |
| `no-stop`                 | position opened with no protective stop                 |
| `oversized`               | risk at entry > X% of equity                            |
| `stop-widened`            | stop moved _away_ from entry                            |
| `revenge-trade`           | new trade within N bars of a loss, larger size          |
| `averaging-down`          | adding to a losing position                             |
| `overtrading`             | more than N trades per session                          |
| `held-through-limit-risk` | open risk would breach the daily limit if the stop hits |

The post-mortem builds a **causal story** from these flags plus the failure event.
The chain goes: failure → the trades that contributed the most → the flags on
those trades → the concept to learn.

---

## 5. Price generator (v1)

The hidden regime is the **Weinstein stage cycle**. The **TYX index** has its
own stage cycle, and each stock follows the index through its beta plus its own
idiosyncratic cycle.

```
stage    ~ semi-Markov cycle 1 → 2 → 3 → 4 → 1, durations drawn per stage (in weeks)
           (with failure branches: 1 → 4 breakdown, 2 → 1 failed breakout,
            3 → 2 re-accumulation)
vol_t    = GARCH-like: ω + α·r²_{t-1} + β·vol_{t-1}                  (volatility clustering)
r_t      = β · r_index
         + drift(stage)                                              (≈0 in 1, + in 2, ≈0 in 3, − in 4)
         + κ(stage) · (ln anchor − ln p)                             (mean reversion inside 1 and 3)
         + vol_t · ε,  ε ~ Student-t (fat tails)
         + jump · Poisson(λ_news)                                    (rare shocks)
p_t      = p_{t-1} · exp(r_t), rounded to tickSize
volume_t = base · profile(stage, transition) · intraday U-shape · noise
           (spike ≥ 2× on the 1 → 2 breakout, heavy volume on 3 → 4 breakdowns)
```

Plus:

- a **U-shaped intraday volatility/volume** profile across the six 65m bars,
- an **overnight gap** between days,
- a spread that widens with volatility.

Tuning goal: reading the stage correctly gives a _small, real_ edge, and
ignoring it (buying Stage 4, shorting Stage 2) costs money on average. We check
this with an automated test: run the rules bot and a random trader on many
seeds, and assert that the bot's expectancy is positive and the random trader's
isn't. Failure branches keep it honest: not every breakout works.

The value desk (Phase 3) swaps in a different model: price follows a noisy,
catalyst-driven convergence toward a **hidden intrinsic value**, which is itself
driven by the generated fundamentals.

---

## 6. Save format

A save is `seed + command log + final cursor`, with an optional snapshot
([ADR-0005](adr/0005-run-reducer-advance-and-apply.md)). The market is never
saved: it is regenerated from the seed.

```ts
interface SaveFile {
  version: number; // with migrations
  engineVersion: number; // a change in how commands resolve bumps it
  profile: Profile;
  activeRun?: {
    seed: number;
    ruleSetId?: string; // M4
    commandLog: Command[]; // commands only, each stamped with its bar
    cursor: number; // final cursor
    snapshot?: RunState; // optional, for fast loading
  };
  history: RunSummary[]; // finished runs (summary only)
}
```

Load = restore the snapshot if one exists, otherwise replay the command log from
the seed (§3.3). Tests assert that `replay(seed, log)` deep-equals the live
state (this catches any non-determinism). Changing how a command resolves
(spread, rounding) changes replays, so it bumps `ENGINE_VERSION` even when the
market itself is unchanged. Persisting saves is M7; M2 keeps the log in the
store only.
