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

**Core rule: the simulation engine is framework-free TypeScript** (`src/engine/`)
with no React imports and no DOM access. The UI only reads snapshots and sends
commands. This keeps the engine testable, deterministic, and movable into a Web
Worker later if performance needs it.

```
src/
  engine/        pure simulation: rng, clock, market gen, orders, accounting, rules, events
  content/       data: rulesets, concepts (advisor text), company archetypes, scenarios
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

- Seeded PRNG (e.g. `sfc32` / `mulberry32`). `Math.random()` is banned in `engine/`.
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

The 52-week RS needs history, so every run starts with **~2 years of warm-up
data** already on the chart.

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

### 3.3 The step function

The engine is a pure reducer:

```ts
function step(state: GameState, commands: Command[]): StepResult;
// StepResult = { state: GameState; events: GameEvent[] }
```

Order of operations for **each substep**:

1. **Apply commands** queued since the last substep (place/cancel/modify orders,
   close position). Validate them (buying power, rule constraints) and emit
   rejections as events.
2. **Advance the market**: generate the next price point for each instrument
   (see §5).
3. **Match orders** against the new price: market → fill at current price plus
   spread; stop/limit → fill if touched. If the price gapped through a stop, fill
   at the gap price (this teaches gap risk and slippage).
4. **Mark to market**: recompute unrealized P&L, equity, margin used, and
   high-water mark.
5. **Evaluate rules**: prop limits, margin call. A breach means immediate
   liquidation, `run.status = 'failed'`, and a `failureReason`.
6. **Run detectors**: behavior detectors check recent history
   (see §4.6) and emit `BehaviorFlag` events.
7. **Boundary hooks**: at the end of a bar, close the candle and update
   indicators. At the end of a session, reset the daily loss baseline and
   generate the overnight gap. At the end of a quarter, run firm updates (later).

### 3.4 Game loop (UI side)

```
requestAnimationFrame → accumulate real time × speed
  → run k substeps through engine.step()
  → publish a snapshot to the Zustand store (throttled to frame rate)
  → React renders the panels that subscribe to changed slices
```

Commands from the UI are queued and applied at step 1 of the next substep, never
applied to state directly.

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

```ts
type Side = 'buy' | 'sell';

interface Order {
  id: string;
  instrumentId: InstrumentId;
  side: Side;
  type: 'market' | 'limit' | 'stop';
  qty: number;
  price?: number; // limit/stop trigger
  parentId?: string; // bracket children (stop-loss / take-profit)
  ocoGroup?: string; // one-cancels-other
  status: 'working' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number; // substep index
}

interface Fill {
  orderId: string;
  qty: number;
  price: number;
  t: number;
  fee: number;
}

interface Position {
  instrumentId: InstrumentId;
  qty: number; // signed: >0 long, <0 short
  avgPrice: number;
  openedAt: number;
  initialStop?: number; // captured at entry, used for R-multiple and detectors
  riskAtEntry?: number; // cents at risk if the initial stop is hit (Infinity if none)
}

interface Account {
  startingBalance: number; // cents
  cash: number;
  equity: number; // cash + unrealized
  highWaterMark: number;
  sessionStartEquity: number; // baseline for daily loss
  marginUsed: number;
  leverage: number;
}

interface ClosedTrade {
  id: string;
  instrumentId: InstrumentId;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  qty: number;
  openedAt: number;
  closedAt: number;
  pnl: number; // cents, net of fees
  rMultiple?: number; // pnl / riskAtEntry
  regimeAtEntry: RegimeId; // hidden during play; used in post-game stats
  flags: BehaviorFlagId[]; // detectors that fired on this trade
}
```

### 4.3 Run & rules (prop challenge)

```ts
interface RuleSet {
  id: string; // e.g. "phase1-standard"
  profitTargetPct: number; // e.g. 10
  maxDailyLossPct: number; // e.g. 5, measured from sessionStartEquity
  maxTotalLossPct: number; // e.g. 10, from startingBalance (or trailing HWM)
  trailingDrawdown: boolean;
  minTradingSessions: number;
  maxSessions: number;
  allowedInstruments: InstrumentId[];
}

interface Run {
  id: string;
  seed: number;
  mode: 'prop' | 'value' | 'macro' | 'sandbox' | 'backtest';
  ruleSet?: RuleSet;
  status: 'active' | 'passed' | 'failed';
  failure?: { rule: string; at: number; detail: string };
  account: Account;
  orders: Order[];
  positions: Position[];
  trades: ClosedTrade[];
  equityCurve: { t: number; equity: number }[];
  commandLog: Command[]; // enough to replay the run from its seed
}

interface GameState {
  market: MarketState;
  run: Run;
  rngState: RngStreams;
}
```

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
type GameEvent =
  | { type: 'fill'; fill: Fill }
  | { type: 'orderRejected'; orderId: string; reason: string }
  | { type: 'ruleBreach'; rule: string; detail: string }
  | { type: 'conceptUsed'; conceptId: ConceptId } // drives first-use explanations
  | { type: 'behaviorFlag'; flag: BehaviorFlagId; tradeId?: string; detail: string }
  | { type: 'news'; headline: string; instrumentIds: InstrumentId[] }
  | { type: 'sessionEnd' | 'quarterEnd'; index: number };

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
           (with failure branches: 1 → 4 breakdown, 2 → 1 failed breakout)
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

```ts
interface SaveFile {
  version: number; // with migrations
  profile: Profile;
  activeRun?: { seed: number; ruleSetId: string; commandLog: Command[]; snapshot?: GameState };
  history: RunSummary[]; // finished runs (summary only)
}
```

Load = restore the snapshot if one exists, otherwise replay the command log from
the seed. Tests assert that `replay(seed, log)` matches the live state (this
catches any non-determinism).
