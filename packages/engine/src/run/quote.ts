import { clampCursor } from '../cursor';
import { findInstrument } from '../market/marketTimeline';
import type { Cursor, MarketTimeline, Ticker } from '../market/types';
import { STOCKS } from '../universe';
import type { TradeQuote } from './types';

const SPREAD_BPS: ReadonlyMap<Ticker, number> = new Map(
  STOCKS.flatMap((s) => (s.spreadBps ? [[s.ticker, s.spreadBps] as const] : [])),
);

/**
 * Bid and ask of a stock at the cursor (spec #19, "Quote and spread"): mid =
 * close of the bar at the cursor; half spread = mid × bps / 2, rounded up to
 * the cent and at least 1 cent, so the ask rounds up and the bid down: always
 * against the player. `null` for the index and unknown tickers (not tradable).
 */
export function tradeQuote(
  timeline: MarketTimeline,
  ticker: Ticker,
  cursor: Cursor,
): TradeQuote | null {
  const instrument = findInstrument(timeline, ticker);
  const spreadBps = SPREAD_BPS.get(ticker);
  if (!instrument || instrument.info.kind !== 'stock' || !spreadBps) return null;
  const mid = instrument.bars[clampCursor(timeline, cursor)]!.c;
  // ceil(mid × bps / 20000) in integer arithmetic, so no float rounding creeps in.
  const half = Math.max(1, Math.floor((mid * spreadBps + 19_999) / 20_000));
  return { ticker, mid, bid: mid - half, ask: mid + half, spreadBps };
}
