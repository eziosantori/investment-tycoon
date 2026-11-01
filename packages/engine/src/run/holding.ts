import type { Level } from '../chart/tools';
import { BARS_PER_SESSION, SESSIONS_PER_WEEK } from '../market/calendar';
import type { Cursor } from '../market/types';
import { SHORT_UNLOCK_LEVEL } from './reducer';
import type { Duration, HoldingCard, Position, TradeQuote } from './types';

/** Bars → sessions below a week, weeks from then on. */
export function durationBetween(from: Cursor, to: Cursor): Duration {
  const sessions = Math.floor(Math.max(0, to - from) / BARS_PER_SESSION);
  return sessions >= SESSIONS_PER_WEEK
    ? { value: Math.floor(sessions / SESSIONS_PER_WEEK), unit: 'weeks' }
    : { value: sessions, unit: 'sessions' };
}

/** The HOLDING card for a position valued at the quote's mid (spec #19). */
export function holdingCard(
  position: Position,
  quote: TradeQuote,
  cursor: Cursor,
  level: Level,
): HoldingCard {
  const side = position.shares > 0 ? 'long' : 'short';
  const shares = Math.abs(position.shares);
  const basis = Math.abs(position.costBasis);
  const openPnl = position.shares * quote.mid - position.costBasis;
  return {
    label: level >= SHORT_UNLOCK_LEVEL ? (side === 'long' ? 'LONG' : 'SHORT') : 'HOLDING',
    side,
    shares,
    ticker: position.ticker,
    avgPrice: basis / shares,
    openPnl,
    openPnlPct: basis > 0 ? (openPnl / basis) * 100 : 0,
    held: durationBetween(position.openedAt, cursor),
  };
}
