import type { Stage } from './types';

/**
 * The market's tunable parameter set (M1 spec: "All probabilities and
 * durations live in the tunable parameter set"). Tuning the market means
 * editing this file, nowhere else. The statistical tests pin ranges, not these
 * exact numbers.
 *
 * Shape: one `InstrumentParams` per kind (index, stock) plus the deal. The
 * price model and the stage signatures (#10, #12) add their own sections to
 * `InstrumentParams` next to `stageCycle`.
 *
 * A single stock can override its stage cycle from the content file
 * (`InstrumentSpec.stageCycle`); thanks to per-instrument RNG streams that
 * leaves every other stock unchanged.
 */

/** Semi-Markov stage cycle 1 → 2 → 3 → 4 → 1 with its failure branches. */
export interface StageCycleParams {
  /** Min/max length of each stage, in weeks (inclusive). */
  durations: Readonly<Record<Stage, readonly [number, number]>>;
  /** 1 → 4: probability that a base breaks down instead of breaking out. */
  pBreakdown: number;
  /** 2 → 1: probability that a breakout fails and falls back into the base. */
  pFailedBreakout: number;
  /** Min/max length of a failed breakout's Stage 2 before it is back in the base, in weeks. */
  failedBreakoutWeeks: readonly [number, number];
  /** 3 → 2: probability that a top resolves back up (re-accumulation) instead of down. */
  pReaccumulation: number;
}

/** Everything tunable about one kind of instrument. #10/#12 add price and signature params. */
export interface InstrumentParams {
  stageCycle: StageCycleParams;
}

/** The deal: the spread of stages at the first run bar. */
export interface DealParams {
  /** Min/max number of stocks dealt setting up (late Stage 1 / early Stage 2). */
  settingUp: readonly [number, number];
  /** Min/max number of stocks dealt in Stage 3 or 4. */
  traps: readonly [number, number];
  /** "Late Stage 1": the base ends within this many weeks from the first run week. */
  lateBaseWeeks: number;
  /** "Early Stage 2": the first run week is within the first this-many weeks of Stage 2. */
  earlyAdvanceWeeks: number;
}

export interface MarketParams {
  index: InstrumentParams;
  stock: InstrumentParams;
  deal: DealParams;
}

export const MARKET_PARAMS: MarketParams = {
  index: {
    stageCycle: {
      durations: { 1: [15, 40], 2: [40, 120], 3: [8, 20], 4: [15, 45] },
      pBreakdown: 0.1,
      pFailedBreakout: 0.15,
      failedBreakoutWeeks: [2, 6],
      pReaccumulation: 0.3,
    },
  },
  stock: {
    stageCycle: {
      durations: { 1: [20, 60], 2: [20, 70], 3: [8, 25], 4: [15, 50] },
      pBreakdown: 0.15,
      pFailedBreakout: 0.2,
      failedBreakoutWeeks: [2, 6],
      pReaccumulation: 0.2,
    },
  },
  deal: {
    settingUp: [3, 5],
    traps: [2, 4],
    lateBaseWeeks: 6,
    earlyAdvanceWeeks: 4,
  },
};
