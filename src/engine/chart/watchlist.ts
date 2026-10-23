import { clampCursor } from '../cursor';
import { instrumentsOf, resolveInstrument } from '../market/marketTimeline';
import type { Cursor, InstrumentInfo, MarketTimeline, Ticker } from '../market/types';
import { quoteAt, type Quote } from './quote';

/** One row of the ticker switcher / side panel: an instrument quoted at the cursor. */
export interface WatchlistRow {
  ticker: Ticker;
  name: string;
  kind: InstrumentInfo['kind'];
  quote: Quote;
  selected: boolean;
}

/** Every instrument (index first, then the stocks) quoted at the cursor. */
export function watchlist(
  timeline: MarketTimeline,
  cursor: Cursor,
  selected: Ticker,
): WatchlistRow[] {
  const at = clampCursor(timeline, cursor);
  const shown = resolveInstrument(timeline, selected).info.ticker;
  return instrumentsOf(timeline).map((inst) => ({
    ticker: inst.info.ticker,
    name: inst.info.name,
    kind: inst.info.kind,
    quote: quoteAt(inst, at),
    selected: inst.info.ticker === shown,
  }));
}
