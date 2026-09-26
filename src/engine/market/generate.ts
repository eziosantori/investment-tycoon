import { createStream, type Rng } from '../rng';
import { buildStageTimeline, INDEX_STAGES, STOCK_STAGES } from './stageCycle';
import type { Bar, Stage } from './types';

/**
 * M0 market generator: daily bars for the TYX index and one stock, driven by
 * hidden stage cycles. M1 refines this to 65m bars with an intraday path
 * (docs/ARCHITECTURE.md §3 and §5); the stage model stays the same.
 */

export const DAYS_PER_WEEK = 5;
const TRADING_DAYS_PER_YEAR = 252;

interface StageParams {
  /** Annualized log drift. */
  drift: number;
  /** Daily volatility of idiosyncratic returns. */
  vol: number;
  /** Mean-reversion strength toward the stage anchor (per day). */
  kappa: number;
  /** Volume multiplier. */
  volume: number;
}

const STOCK_PARAMS: Record<Stage, StageParams> = {
  1: { drift: 0, vol: 0.017, kappa: 0.04, volume: 0.75 },
  2: { drift: 0.55, vol: 0.02, kappa: 0, volume: 1.1 },
  3: { drift: 0, vol: 0.027, kappa: 0.03, volume: 1.3 },
  4: { drift: -0.5, vol: 0.025, kappa: 0, volume: 1.15 },
};

const INDEX_PARAMS: Record<Stage, StageParams> = {
  1: { drift: 0.02, vol: 0.008, kappa: 0.02, volume: 0.9 },
  2: { drift: 0.18, vol: 0.008, kappa: 0, volume: 1 },
  3: { drift: 0, vol: 0.011, kappa: 0.02, volume: 1.15 },
  4: { drift: -0.3, vol: 0.013, kappa: 0, volume: 1.2 },
};

export interface GenerateOptions {
  seed: number;
  weeks: number;
  startPrice?: number;
  indexStartPrice?: number;
  beta?: number;
  tickSize?: number;
}

export interface GeneratedMarket {
  index: Bar[];
  stock: Bar[];
}

export function roundToTick(price: number, tick: number): number {
  return Math.round(price / tick) * tick;
}

interface SeriesSpec {
  stages: Stage[];
  params: Record<Stage, StageParams>;
  startPrice: number;
  tickSize: number;
  baseVolume: number;
  /** Daily log returns of the index, for beta exposure (stock only). */
  market?: { returns: number[]; beta: number };
}

function generateDaily(spec: SeriesSpec, rng: Rng): { bars: Bar[]; returns: number[] } {
  const bars: Bar[] = [];
  const returns: number[] = [];
  let close = spec.startPrice;
  let anchor = close;
  let garch = 1; // volatility multiplier with clustering
  let prevStage = spec.stages[0] ?? 1;

  for (let w = 0; w < spec.stages.length; w++) {
    const stage = spec.stages[w] ?? prevStage;
    const p = spec.params[stage];
    const transition = stage !== prevStage;
    if (transition) anchor = close;

    for (let d = 0; d < DAYS_PER_WEEK; d++) {
      const day = w * DAYS_PER_WEEK + d;
      const eps = rng.studentT(4);
      const shock = eps * p.vol * garch;
      let r =
        p.drift / TRADING_DAYS_PER_YEAR +
        p.kappa * (Math.log(anchor) - Math.log(close)) +
        shock +
        (spec.market ? spec.market.beta * (spec.market.returns[day] ?? 0) : 0);

      // Breakouts and breakdowns open with a gap and heavy volume.
      let volumeBoost = 1;
      if (transition && d === 0) {
        if (prevStage === 1 && stage === 2) r += rng.range(0.03, 0.06);
        if (stage === 4) r -= rng.range(0.02, 0.05);
      }
      if (transition && (stage === 2 || stage === 4)) volumeBoost = rng.range(1.9, 2.8);

      garch = Math.min(2.5, Math.max(0.6, 0.9 * garch + 0.1 * (0.6 + Math.abs(eps))));

      const open = close * Math.exp(rng.normal() * p.vol * 0.25);
      const nextClose = Math.max(spec.tickSize * 10, close * Math.exp(r));
      const range = p.vol * garch * 0.6;
      const high = Math.max(open, nextClose) * Math.exp(Math.abs(rng.normal()) * range);
      const low = Math.min(open, nextClose) * Math.exp(-Math.abs(rng.normal()) * range);
      const volume =
        spec.baseVolume *
        p.volume *
        volumeBoost *
        (1 + (2 * Math.abs(r)) / p.vol) *
        Math.exp(rng.normal() * 0.25);

      const t = spec.tickSize;
      const c = roundToTick(nextClose, t);
      bars.push({
        t: day,
        o: roundToTick(open, t),
        h: roundToTick(Math.max(high, open, nextClose), t),
        l: roundToTick(Math.min(low, open, nextClose), t),
        c,
        v: Math.round(volume),
        stage,
      });
      returns.push(Math.log(nextClose / close));
      close = nextClose;
    }
    prevStage = stage;
  }
  return { bars, returns };
}

export function generateMarket(opts: GenerateOptions): GeneratedMarket {
  const tickSize = opts.tickSize ?? 0.01;
  const stageRng = createStream(opts.seed, 'stages');
  const indexStages = buildStageTimeline(opts.weeks, INDEX_STAGES, stageRng);
  const stockStages = buildStageTimeline(opts.weeks, STOCK_STAGES, stageRng);

  const index = generateDaily(
    {
      stages: indexStages,
      params: INDEX_PARAMS,
      startPrice: opts.indexStartPrice ?? 4000,
      tickSize,
      baseVolume: 2_000_000_000,
    },
    createStream(opts.seed, 'index'),
  );

  const stock = generateDaily(
    {
      stages: stockStages,
      params: STOCK_PARAMS,
      startPrice: opts.startPrice ?? 40,
      tickSize,
      baseVolume: 1_500_000,
      market: { returns: index.returns, beta: opts.beta ?? 1.1 },
    },
    createStream(opts.seed, 'stock'),
  );

  return { index: index.bars, stock: stock.bars };
}
