import { BARS_PER_SESSION, SESSIONS_PER_WEEK } from '../market/calendar';
import type { Cursor, MarketTimeline } from '../market/types';
import { tradeQuote } from './quote';
import type { BattleLog, BattleLogRow, Duration, Fill, RunState, Trade } from './types';

/** A span between two bars: whole weeks from a week, whole sessions below. */
export function durationBetween(from: Cursor, to: Cursor): Duration {
  const sessions = Math.floor(Math.max(0, to - from) / BARS_PER_SESSION);
  return sessions >= SESSIONS_PER_WEEK
    ? { value: Math.floor(sessions / SESSIONS_PER_WEEK), unit: 'weeks' }
    : { value: sessions, unit: 'sessions' };
}

/**
 * The battle log (spec #19): one row per trade, open trades first as live
 * rows (current P&L, no exit), then closed ones, newest first.
 */
export function battleLog(
  run: RunState,
  timeline: MarketTimeline,
  totalRealized: number,
): BattleLog {
  const fills = new Map(run.fills.map((f) => [f.id, f]));
  const rows = run.trades.map((t) => rowOf(run, timeline, t, fills));
  const newestFirst = (a: BattleLogRow, b: BattleLogRow) => b.tradeId - a.tradeId;
  return {
    rows: [
      ...rows.filter((r) => r.live).sort(newestFirst),
      ...rows.filter((r) => !r.live).sort(newestFirst),
    ],
    totalRealized,
  };
}

function rowOf(
  run: RunState,
  timeline: MarketTimeline,
  trade: Trade,
  fills: ReadonlyMap<number, Fill>,
): BattleLogRow {
  const entrySide = trade.side === 'long' ? 'buy' : 'sell';
  let held = 0;
  let peak = 0;
  let entryShares = 0;
  let entryValue = 0;
  let exitShares = 0;
  let exitValue = 0;
  for (const id of trade.fillIds) {
    const fill = fills.get(id)!;
    if (fill.side === entrySide) {
      held += fill.shares;
      entryShares += fill.shares;
      entryValue += fill.shares * fill.price;
    } else {
      held -= fill.shares;
      exitShares += fill.shares;
      exitValue += fill.shares * fill.price;
    }
    peak = Math.max(peak, held);
  }

  const live = trade.closedAt === null;
  const position = run.positions[trade.ticker];
  const mid = tradeQuote(timeline, trade.ticker, run.cursor)?.mid ?? 0;
  const openPnl = live && position ? position.shares * mid - position.costBasis : 0;
  const pnl = trade.realizedPnl + openPnl;

  return {
    tradeId: trade.id,
    ticker: trade.ticker,
    side: trade.side,
    shares: peak,
    avgEntry: entryValue / entryShares,
    avgExit: live || exitShares === 0 ? null : exitValue / exitShares,
    pnl,
    pnlPct: entryValue > 0 ? (pnl / entryValue) * 100 : 0,
    duration: durationBetween(trade.openedAt, trade.closedAt ?? run.cursor),
    live,
  };
}
