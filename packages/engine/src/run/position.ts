import { SESSIONS_PER_WEEK, sessionOfBar } from '../market/calendar';
import type { Cents, Cursor, MarketTimeline, Ticker } from '../market/types';
import { tradeQuote } from './quote';
import type { Duration, Position, PositionSide } from './types';

/** The mid a ticker is valued at on a bar; 0 when it has no quote. */
export function midOf(timeline: MarketTimeline, ticker: Ticker, cursor: Cursor): Cents {
  return tradeQuote(timeline, ticker, cursor)?.mid ?? 0;
}

/** A position's open P&L at a mid. */
export function openPnlOf(position: Position, mid: Cents): Cents {
  return position.shares * mid - position.costBasis;
}

/** Long for positive shares, short for negative. */
export function sideOf(position: Pick<Position, 'shares'>): PositionSide {
  return position.shares > 0 ? 'long' : 'short';
}

/**
 * The sessions from `from` to `to`, both included (a trade opened on the
 * current bar has been held 1 session); in weeks from a week's worth of sessions.
 */
export function durationBetween(from: Cursor, to: Cursor): Duration {
  const sessions = Math.max(0, sessionOfBar(to) - sessionOfBar(from)) + 1;
  return sessions >= SESSIONS_PER_WEEK
    ? { value: Math.floor(sessions / SESSIONS_PER_WEEK), unit: 'weeks' }
    : { value: sessions, unit: 'sessions' };
}
