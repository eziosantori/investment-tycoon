import type { Level } from '../chart/tools';
import type { Cursor } from '../market/types';
import { durationBetween, openPnlOf, sideOf } from './position';
import { SHORT_UNLOCK_LEVEL } from './reducer';
import type { HoldingCard, Position, TradeQuote } from './types';

/** The HOLDING card for a position valued at the quote's mid (spec #19). */
export function holdingCard(
  position: Position,
  quote: TradeQuote,
  cursor: Cursor,
  level: Level,
): HoldingCard {
  const side = sideOf(position);
  const shares = Math.abs(position.shares);
  const basis = Math.abs(position.costBasis);
  const openPnl = openPnlOf(position, quote.mid);
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
