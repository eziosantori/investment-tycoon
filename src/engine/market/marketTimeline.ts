import { INDEX, STOCKS } from '../../content/universe';
import { createStream } from '../rng';
import { ENGINE_VERSION } from '../version';
import { assembleInstrument } from './assemble';
import { RUN_WEEKS, WARMUP_WEEKS } from './calendar';
import { readDeal } from './deal';
import { generateHiddenStages, type Universe } from './hiddenStages';
import { MARKET_PARAMS, type MarketParams } from './params';
import { generatePriceSeries } from './priceSeries';
import type { InstrumentTimeline, MarketTimeline, Ticker } from './types';
import { infoOf } from './universe';

/** The universe of the content file: TYX and the 12 stocks. */
export const DEFAULT_UNIVERSE: Universe = { index: INDEX, stocks: STOCKS };

/**
 * Market generation: seed → the run's whole market timeline (ADR-0001). Pure
 * and deterministic; the UI calls this once per seed and keeps the result
 * outside the store.
 *
 * Hidden stages are dealt first (`./hiddenStages`), then the index's 65m bars,
 * then each stock's on top of the index's moves (`./priceSeries`). Every
 * instrument draws from its own `stages:<ticker>` and `series:<ticker>`
 * streams, so editing one stock leaves every other instrument identical.
 *
 * @param universe defaults to the content file; tests pass edited copies
 * @param params defaults to `MARKET_PARAMS`
 */
export function generateMarketTimeline(
  seed: number,
  universe: Universe = DEFAULT_UNIVERSE,
  params: MarketParams = MARKET_PARAMS,
): MarketTimeline {
  const stages = generateHiddenStages(seed, universe, params);

  const indexSeries = generatePriceSeries(
    universe.index,
    stages.index,
    params.index.price,
    createStream(seed, `series:${universe.index.ticker}`),
    null,
  );
  const index = assembleInstrument(
    infoOf(universe.index, 'index'),
    indexSeries.bars,
    stages.index,
    null,
  );

  const stocks = universe.stocks.map((spec, i) => {
    const stockStages = stages.stocks[i]!;
    const { bars } = generatePriceSeries(
      spec,
      stockStages,
      params.stock.price,
      createStream(seed, `series:${spec.ticker}`),
      { index: indexSeries.moves, beta: spec.beta },
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
    deal: readDeal(index, stocks, WARMUP_WEEKS, params.deal),
  };
}
/** All instruments, index first, then the stocks in universe order. */
export function instrumentsOf(timeline: MarketTimeline): InstrumentTimeline[] {
  return [timeline.index, ...timeline.stocks];
}

/** Looks an instrument up by ticker; `undefined` if it isn't in the universe. */
export function findInstrument(
  timeline: MarketTimeline,
  ticker: Ticker,
): InstrumentTimeline | undefined {
  return instrumentsOf(timeline).find((i) => i.info.ticker === ticker);
}

/**
 * The instrument a selection shows: the ticker's instrument, or the deal's
 * default when the ticker isn't in the universe (e.g. before a run starts).
 */
export function resolveInstrument(timeline: MarketTimeline, ticker: Ticker): InstrumentTimeline {
  return (
    findInstrument(timeline, ticker) ??
    findInstrument(timeline, timeline.deal.defaultInstrument) ??
    timeline.index
  );
}
