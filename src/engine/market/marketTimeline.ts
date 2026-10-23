import { generateFakeTimeline } from './fakeTimeline';
import type { InstrumentTimeline, MarketTimeline, Ticker } from './types';

/**
 * Market generation: seed → the run's whole market timeline (ADR-0001). Pure
 * and deterministic; the UI calls this once per seed and keeps the result
 * outside the store.
 *
 * M1 #2: backed by the fake timeline. #5/#10 swap in the real generator here
 * without changing the signature.
 */
export function generateMarketTimeline(seed: number): MarketTimeline {
  return generateFakeTimeline(seed);
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
