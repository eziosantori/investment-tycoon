import { createStream } from '../rng';
import { RUN_WEEKS, WARMUP_WEEKS } from './calendar';
import { dealTargets } from './deal';
import { MARKET_PARAMS, type MarketParams } from './params';
import { buildStages, chooseAnchor, type AnchorTarget } from './stageCycle';
import type { Stage } from './types';
import type { InstrumentSpec } from './universe';

/** The instruments of a run: the index and the stocks, in content-file order. */
export interface Universe {
  index: InstrumentSpec;
  stocks: readonly InstrumentSpec[];
}

/** Hidden stage of every week (warm-up and run) of every instrument. */
export interface HiddenStages {
  index: Stage[];
  /** Parallel to `Universe.stocks`. */
  stocks: Stage[][];
}

/**
 * Seed → the hidden stages of the whole universe, dealt so that the first run
 * week is balanced (see `./deal`). Each instrument draws from its own
 * `stages:<ticker>` stream and the targets from the `deal` stream, so changing
 * one stock's parameters leaves every other stock's stages unchanged.
 */
export function generateHiddenStages(
  seed: number,
  universe: Universe,
  params: MarketParams = MARKET_PARAMS,
): HiddenStages {
  const weeks = WARMUP_WEEKS + RUN_WEEKS;
  const build = (spec: InstrumentSpec, kind: 'index' | 'stock', target: AnchorTarget) => {
    const cycle = spec.stageCycle ?? params[kind].stageCycle;
    const rng = createStream(seed, `stages:${spec.ticker}`);
    const anchor = chooseAnchor(target, cycle, params.deal, rng);
    return buildStages(weeks, WARMUP_WEEKS, anchor, cycle, rng);
  };
  const targets = dealTargets(seed, universe.stocks.length, params.deal);
  return {
    index: build(universe.index, 'index', 'notDeclining'),
    stocks: universe.stocks.map((spec, i) => build(spec, 'stock', targets[i] ?? 'free')),
  };
}
