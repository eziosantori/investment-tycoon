import type { Stage } from './types';

/**
 * The market's tunable parameter set (M1 spec: "All probabilities and
 * durations live in the tunable parameter set"). Tuning the market means
 * editing this file, nowhere else. The statistical tests pin ranges, not these
 * exact numbers.
 *
 * Shape: one `InstrumentParams` per kind (index, stock) plus the deal. Each
 * holds the stage cycle and the price model (per-stage drift, volatility, mean
 * reversion and volume, plus the shocks, clustering and intraday shape) and
 * the stage signatures (breakout and breakdown volume, gaps and levels, failed
 * breakouts).
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

/** How the idiosyncratic part of the price behaves inside one stage. */
export interface StagePriceParams {
  /** Log drift per week (≈0 in 1 and 3, + in 2, − in 4). */
  drift: number;
  /** Multiplier on the instrument's volatility (base ≈0.7×, top ≈1.3×). */
  vol: number;
  /**
   * Pull per 65m bar toward the stage's anchor (the price level the stage
   * started at), as a fraction of the log distance; 0 = none. Stages 1 and 3.
   */
  meanReversion: number;
  /** Multiplier on the instrument's base volume. */
  volume: number;
}

/**
 * The price model of one kind of instrument (M1 spec, "Price model"): a
 * return per 65m bar = beta × index return (stocks) + drift + mean reversion +
 * a Student-t shock scaled by stage, GARCH-like clustering and the intraday U.
 */
export interface PriceParams {
  /** Volatility of one session's idiosyncratic log return, before `volScale` and stage. */
  sessionVol: number;
  stages: Readonly<Record<Stage, StagePriceParams>>;
  /** Degrees of freedom of the Student-t shocks (fat tails; an integer > 2). */
  shockDf: number;
  /**
   * GARCH(1,1)-like variance multiplier per bar, mean 1:
   * h' = (1 − α − β) + α·z²·h + β·h, clamped to `range`.
   */
  clustering: { alpha: number; beta: number; range: readonly [number, number] };
  /**
   * Intraday U shape, one entry per bar of the session (09:30 … 14:55),
   * relative; volatility is normalized so the session keeps `sessionVol`.
   */
  intradayVol: readonly number[];
  intradayVolume: readonly number[];
  /** Overnight gap: normal with this standard deviation × the session's volatility. */
  overnightGap: number;
  /** High/low wick beyond the body, × the bar's volatility (half-normal). */
  wick: number;
  /** Volume grows by this × |shock| (busy bars trade more). */
  volumeShock: number;
  /** Standard deviation of the lognormal noise on each bar's volume. */
  volumeNoise: number;
}

type Range = readonly [number, number];

/**
 * The stage signatures (M1 spec, "Stage signatures"): how the transitions look
 * on the chart. Levels are weekly closes (a base's resistance is its highest
 * close, its support the lowest; a top's support its lowest close); volume
 * ratios are against the average of the previous 10 weeks. Ranges are drawn
 * uniformly per event. The base and the top live in `PriceParams.stages`
 * (volatility, volume, mean reversion).
 */
export interface SignatureParams {
  /** Stage 1 → 2. */
  breakout: {
    /** Breakout-week volume ÷ the 10-week average. */
    volume: Range;
    /** Volume of the weeks after a breakout that holds, ÷ the same average. */
    followVolume: Range;
    followWeeks: number;
    /** Probability of an opening gap up, and its size (fraction of the price). */
    gapChance: number;
    gap: Range;
    /** The week closes at least this far above resistance (fraction). */
    clearance: Range;
  };
  /** Stage 2 → 1, after the breakout week. */
  failedBreakout: {
    /** Volume of the weeks back toward the base ÷ the 10-week average ("normal"). */
    volume: Range;
    /** Pull per 65m bar back toward the base, as for `meanReversion`. */
    pull: number;
    /** The last Stage 2 week closes at least this far below resistance. */
    clearance: Range;
  };
  /** Stage 1 → 4 or 3 → 4. */
  breakdown: {
    volume: Range;
    gapChance: number;
    gap: Range;
    /** The week closes at least this far below support. */
    clearance: Range;
  };
}

/** Everything tunable about one kind of instrument. */
export interface InstrumentParams {
  stageCycle: StageCycleParams;
  price: PriceParams;
  signatures: SignatureParams;
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

/** U-shaped intraday profile: busy open and close (≈1.5×), quiet middle (≈0.7×). */
const INTRADAY_VOL = [1.5, 1, 0.7, 0.7, 1, 1.5] as const;
const INTRADAY_VOLUME = [1.5, 1, 0.7, 0.7, 1, 1.5] as const;

/** Weinstein's numbers, shared by the index and the stocks. */
const SIGNATURES: SignatureParams = {
  breakout: {
    volume: [2, 3],
    followVolume: [1.3, 1.8],
    followWeeks: 2,
    gapChance: 0.5,
    gap: [0.02, 0.04],
    clearance: [0.01, 0.03],
  },
  failedBreakout: { volume: [0.8, 1.2], pull: 0.003, clearance: [0.01, 0.03] },
  breakdown: { volume: [1.5, 2.5], gapChance: 0.4, gap: [0.02, 0.04], clearance: [0.01, 0.03] },
};

export const MARKET_PARAMS: MarketParams = {
  index: {
    stageCycle: {
      durations: { 1: [15, 40], 2: [40, 120], 3: [8, 20], 4: [15, 45] },
      pBreakdown: 0.1,
      pFailedBreakout: 0.15,
      failedBreakoutWeeks: [2, 6],
      pReaccumulation: 0.3,
    },
    price: {
      sessionVol: 0.0065,
      stages: {
        1: { drift: 0.0005, vol: 0.85, meanReversion: 0.004, volume: 0.9 },
        2: { drift: 0.0035, vol: 0.9, meanReversion: 0, volume: 1 },
        3: { drift: 0, vol: 1.15, meanReversion: 0.003, volume: 1.15 },
        4: { drift: -0.0055, vol: 1.35, meanReversion: 0, volume: 1.2 },
      },
      shockDf: 5,
      clustering: { alpha: 0.05, beta: 0.93, range: [0.3, 5] },
      intradayVol: INTRADAY_VOL,
      intradayVolume: INTRADAY_VOLUME,
      overnightGap: 0.3,
      wick: 0.45,
      volumeShock: 0.25,
      volumeNoise: 0.2,
    },
    signatures: SIGNATURES,
  },
  stock: {
    stageCycle: {
      durations: { 1: [20, 60], 2: [20, 70], 3: [8, 25], 4: [15, 50] },
      pBreakdown: 0.15,
      pFailedBreakout: 0.2,
      failedBreakoutWeeks: [2, 6],
      pReaccumulation: 0.2,
    },
    price: {
      sessionVol: 0.013,
      stages: {
        1: { drift: 0, vol: 0.7, meanReversion: 0.006, volume: 0.7 },
        2: { drift: 0.011, vol: 1, meanReversion: 0, volume: 1.1 },
        3: { drift: 0, vol: 1.3, meanReversion: 0.004, volume: 1.3 },
        4: { drift: -0.011, vol: 1.15, meanReversion: 0, volume: 1.15 },
      },
      shockDf: 4,
      clustering: { alpha: 0.06, beta: 0.92, range: [0.3, 6] },
      intradayVol: INTRADAY_VOL,
      intradayVolume: INTRADAY_VOLUME,
      overnightGap: 0.3,
      wick: 0.5,
      volumeShock: 0.3,
      volumeNoise: 0.25,
    },
    signatures: SIGNATURES,
  },
  deal: {
    settingUp: [3, 5],
    traps: [2, 4],
    lateBaseWeeks: 6,
    earlyAdvanceWeeks: 4,
  },
};
