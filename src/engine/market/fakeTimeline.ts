import { INDEX, STOCKS } from '../../content/universe';
import { createStream, type Rng } from '../rng';
import { ENGINE_VERSION } from '../version';
import { assembleInstrument } from './assemble';
import { BARS_PER_SESSION, BARS_PER_WEEK, RUN_WEEKS, WARMUP_WEEKS } from './calendar';
import { readDeal } from './deal';
import { generateHiddenStages } from './hiddenStages';
import { MARKET_PARAMS } from './params';
import type { Bar, MarketTimeline, Stage } from './types';
import { infoOf, type InstrumentSpec } from './universe';

/**
 * Placeholder market (#2): a simple seeded random walk per instrument, steered
 * by hidden stages, with the exact shape of the real market timeline. It lets
 * playback, the chart and the dev tools be built before the real price
 * series (#10) replaces it. The hidden stages and the deal are already real (#5).
 */

/** Per-bar log drift and volume multiplier by stage. */
const DRIFT: Record<Stage, number> = { 1: 0, 2: 0.0004, 3: 0, 4: -0.00035 };
const VOLUME: Record<Stage, number> = { 1: 0.7, 2: 1.1, 3: 1.3, 4: 1.15 };
/** Per-bar stock volatility before `volScale` (about 2% a session); the index has half. */
const STOCK_VOL = 0.008;
const INDEX_VOL = 0.004;

function fakeBars(
  spec: InstrumentSpec,
  stages: readonly Stage[],
  vol: number,
  rng: Rng,
  market: { returns: readonly number[]; beta: number } | null,
): { bars: Bar[]; returns: number[] } {
  const bars: Bar[] = [];
  const returns: number[] = [];
  const sigma = vol * spec.volScale;
  let price = spec.startPrice;
  for (let i = 0; i < stages.length * BARS_PER_WEEK; i++) {
    const stage = stages[Math.floor(i / BARS_PER_WEEK)] ?? 1;
    const gap = i % BARS_PER_SESSION === 0 ? rng.normal() * sigma : 0;
    const o = Math.max(1, Math.round(price * Math.exp(gap)));
    const r =
      DRIFT[stage] + rng.normal() * sigma + (market ? market.beta * (market.returns[i] ?? 0) : 0);
    const c = Math.max(1, Math.round(o * Math.exp(r)));
    const h = Math.max(
      o,
      c,
      Math.round(Math.max(o, c) * Math.exp(Math.abs(rng.normal()) * sigma * 0.5)),
    );
    const l = Math.max(
      1,
      Math.min(o, c, Math.round(Math.min(o, c) * Math.exp(-Math.abs(rng.normal()) * sigma * 0.5))),
    );
    const v = Math.round(spec.baseVolume * VOLUME[stage] * Math.exp(rng.normal() * 0.3));
    bars.push({ o, h, l, c, v });
    returns.push(Math.log(c / price));
    price = c;
  }
  return { bars, returns };
}

export function generateFakeTimeline(seed: number): MarketTimeline {
  const stages = generateHiddenStages(seed, { index: INDEX, stocks: STOCKS });
  const indexStages = stages.index;
  const indexSeries = fakeBars(
    INDEX,
    indexStages,
    INDEX_VOL,
    createStream(seed, `series:${INDEX.ticker}`),
    null,
  );
  const index = assembleInstrument(infoOf(INDEX, 'index'), indexSeries.bars, indexStages, null);

  const stocks = STOCKS.map((spec, i) => {
    const stockStages = stages.stocks[i]!;
    const { bars } = fakeBars(
      spec,
      stockStages,
      STOCK_VOL,
      createStream(seed, `series:${spec.ticker}`),
      {
        returns: indexSeries.returns,
        beta: spec.beta,
      },
    );
    return assembleInstrument(infoOf(spec, 'stock'), bars, stockStages, index.weeks);
  });

  return {
    seed,
    engineVersion: ENGINE_VERSION,
    warmupWeeks: WARMUP_WEEKS,
    runWeeks: RUN_WEEKS,
    index,
    stocks,
    deal: readDeal(index, stocks, WARMUP_WEEKS, MARKET_PARAMS.deal),
  };
}
