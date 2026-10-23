/**
 * The M1 market contract (ADR-0001, ADR-0002). Every M1 module builds on
 * these types: generation produces a `MarketTimeline`, playback moves a
 * `Cursor` along it, the chart view reads it. Vocabulary: GLOSSARY.md.
 *
 * Related signatures, one module per concern:
 * - calendar constants and bar ↔ session ↔ week math: `./calendar`
 * - market generation (seed → timeline): `./marketTimeline` (`generateMarketTimeline`,
 *   `findInstrument`); the price model: `./priceSeries`
 * - assembling an instrument's timeline from its 65m bars + weekly stages
 *   (aggregation and weekly studies): `./assemble`, `./aggregate`
 * - tunable parameter set (stage cycle, price model, deal): `./params`
 * - hidden stages of the universe, dealt at the first run week: `./hiddenStages`
 *   (cycle: `./stageCycle`; deal targets and reading the deal: `./deal`)
 * - universe spec type: `./universe`; the data: `src/content/universe.ts`
 * - cursor helpers (start/end, advance, next session/week close): `../cursor`
 * - tools-for-level table and `Level`: `../chart/tools`
 * - chart view (what the chart draws) and quote: `../chart/view`, `../chart/quote`
 *
 * UI side: UI store `src/ui/state/store.ts`, timeline context
 * `src/ui/state/timeline.ts`, playback clock and rAF loop `src/ui/playback/`.
 */

/** Weinstein stages: 1 Base · 2 Advance · 3 Top · 4 Decline. */
export type Stage = 1 | 2 | 3 | 4;

/** Integer number of cents. All engine prices are cents. */
export type Cents = number;

/** Integer number of shares. */
export type Shares = number;

/**
 * One OHLCV bar: a 65m bar, or a session or week aggregated from 65m bars.
 * Its time is its position in the series it belongs to (see `./calendar`).
 */
export interface Bar {
  o: Cents;
  h: Cents;
  l: Cents;
  c: Cents;
  v: Shares;
}

/** Chart timeframes: weekly, daily (one bar per session) and 65m. */
export type Timeframe = 'W' | 'D' | '65m';

/** Ticker of an instrument, e.g. "TYX" or a stock from the universe. */
export type Ticker = string;

export interface InstrumentInfo {
  ticker: Ticker;
  name: string;
  kind: 'index' | 'stock';
  /** Sensitivity to index returns; 1 for the index itself. */
  beta: number;
}

/**
 * Weekly studies, one entry per week (parallel to `InstrumentTimeline.weeks`).
 * Entry `w` is computed from closed weeks `0..w` only, so it is valid once week
 * `w` has closed and never needs recomputing. Derived floats, in cents where
 * they are prices; `null` until there is enough history.
 */
export interface WeeklyStudies {
  ma10: (number | null)[];
  ma30: (number | null)[];
  avgVol10: (number | null)[];
  /** Mansfield RS vs the index (×10, on SMA52). All `null` for the index. */
  rs: (number | null)[];
  /** % change of the 30w MA over the last 4 weeks. */
  ma30Slope: (number | null)[];
}

/** One instrument's whole history: warm-up and run weeks. */
export interface InstrumentTimeline {
  info: InstrumentInfo;
  /** 65m bars, the primary series: `totalWeeks × BARS_PER_WEEK` of them. */
  bars: Bar[];
  /** Session bars aggregated from `bars`: `totalWeeks × SESSIONS_PER_WEEK`. */
  sessions: Bar[];
  /** Week bars aggregated from `bars`: `totalWeeks`. */
  weeks: Bar[];
  studies: WeeklyStudies;
  /** Hidden stage of each week. Never shown during play (dev tools only). */
  stages: Stage[];
}

/**
 * The deal: the spread of starting stages at the first run bar, so every seed
 * offers setups and traps.
 */
export interface Deal {
  /** Stocks in late Stage 1 or early Stage 2 at the first run bar. */
  settingUp: Ticker[];
  /** Stocks in Stage 3 or 4 at the first run bar. */
  traps: Ticker[];
  /** Hidden stage of the index at the first run bar. */
  indexStage: Stage;
  /** The stock the chart opens on: the first one setting up. */
  defaultInstrument: Ticker;
}

/**
 * The whole generated market of a run, fixed by the seed before the first bar
 * is shown. Immutable, plain serializable data. Lives outside the UI store.
 */
export interface MarketTimeline {
  seed: number;
  engineVersion: number;
  /** Weeks of history before the run (week indices `0..warmupWeeks-1`). */
  warmupWeeks: number;
  /** Weeks of the run, numbered 1..runWeeks for the player. */
  runWeeks: number;
  index: InstrumentTimeline;
  /** The universe's stocks, in content-file order. */
  stocks: InstrumentTimeline[];
  deal: Deal;
}

/**
 * The point of the timeline the player has reached: the global index of the
 * last revealed 65m bar (inclusive). Everything after it is unseen. A run
 * starts at the last warm-up bar (see `../cursor`).
 */
export type Cursor = number;
