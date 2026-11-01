import type { Level } from '../chart/tools';
import { clampCursor, startCursor } from '../cursor';
import type { Cursor, MarketTimeline, Ticker } from '../market/types';
import { tradeQuote } from './quote';
import type {
  Account,
  Command,
  FlattenCommand,
  Fill,
  MarketOrderCommand,
  Position,
  RefusalReason,
  RunEvent,
  RunSettings,
  RunState,
  RunStep,
  Trade,
  TradeQuote,
} from './types';

/**
 * The run reducer (ADR-0005): a run changes only through `advanceTo` (time)
 * and `apply` (one player command at the cursor). Both are pure and return
 * the new state plus events; `replay` folds a command log over a fresh run.
 */

/** $100,000, in cents. */
export const STARTING_BALANCE = 10_000_000;

/** The level that unlocks short selling. */
export const SHORT_UNLOCK_LEVEL: Level = 7;

/** The run settings the app derives from the player's level. */
export function runSettingsFor(level: Level): RunSettings {
  return { startingBalance: STARTING_BALANCE, allowShort: level >= SHORT_UNLOCK_LEVEL };
}

/** A fresh run: at the start cursor (last warm-up bar), all cash, flat. */
export function newRun(
  timeline: Pick<MarketTimeline, 'warmupWeeks' | 'runWeeks'>,
  settings: RunSettings,
): RunState {
  return {
    cursor: startCursor(timeline),
    cash: settings.startingBalance,
    positions: {},
    trades: [],
    fills: [],
    nextFillId: 1,
    nextTradeId: 1,
    settings,
  };
}

/**
 * Moves the cursor forward to `bar`, clamped to the timeline; never back.
 * Positions are valued at the mid on read (`account`), so M2 emits no events.
 * M3: working orders are matched here, on every bar and substep crossed.
 */
export function advanceTo(state: RunState, timeline: MarketTimeline, bar: Cursor): RunStep {
  const cursor = clampCursor(timeline, bar);
  if (cursor <= state.cursor) return { state, events: [] };
  return { state: { ...state, cursor }, events: [] };
}

/** Applies one command at the run's cursor. A refused command leaves the state unchanged. */
export function apply(state: RunState, timeline: MarketTimeline, command: Command): RunStep {
  if (command.at !== state.cursor) return refuse(state, command, 'wrongBar');
  return command.type === 'flatten'
    ? applyFlatten(state, timeline, command)
    : applyMarketOrder(state, timeline, command, command);
}

/**
 * Rebuilds a run from its settings and command log: for each command,
 * advance to its bar and apply it; then advance to the final cursor.
 */
export function replay(
  timeline: MarketTimeline,
  settings: RunSettings,
  log: readonly Command[],
  finalCursor: Cursor,
): RunState {
  let state = newRun(timeline, settings);
  for (const command of log) {
    state = advanceTo(state, timeline, command.at).state;
    state = apply(state, timeline, command).state;
  }
  return advanceTo(state, timeline, finalCursor).state;
}

/** The account valued at the mid of the bar at the run's cursor. */
export function account(state: RunState, timeline: MarketTimeline): Account {
  let marketValue = 0;
  let openPnl = 0;
  let exposure = 0;
  for (const p of Object.values(state.positions)) {
    const value = p.shares * midOf(timeline, p.ticker, state.cursor);
    marketValue += value;
    openPnl += value - p.costBasis;
    exposure += Math.abs(value);
  }
  const equity = state.cash + marketValue;
  const realizedPnl = state.trades.reduce((sum, t) => sum + t.realizedPnl, 0);
  return {
    cash: state.cash,
    equity,
    openPnl,
    realizedPnl,
    exposure,
    buyingPower: equity - exposure,
  };
}

// ---------- internals ----------

function midOf(timeline: MarketTimeline, ticker: Ticker, cursor: Cursor): number {
  return tradeQuote(timeline, ticker, cursor)?.mid ?? 0;
}

function refuse(state: RunState, command: Command, reason: RefusalReason): RunStep {
  return { state, events: [{ type: 'refused', command, reason }] };
}

function applyFlatten(state: RunState, timeline: MarketTimeline, command: FlattenCommand): RunStep {
  const position = state.positions[command.ticker];
  if (!position) return refuse(state, command, 'noPosition');
  const order: MarketOrderCommand = {
    type: 'marketOrder',
    at: command.at,
    ticker: command.ticker,
    side: position.shares > 0 ? 'sell' : 'buy',
    shares: Math.abs(position.shares),
  };
  return applyMarketOrder(state, timeline, order, command);
}

/**
 * Why a market order can't fill, or `null`. Checks run in this order; each new
 * rule (buying power, end of market: #24) slots in here.
 */
function refusalOf(
  state: RunState,
  order: MarketOrderCommand,
  quote: TradeQuote | null,
): RefusalReason | null {
  if (!Number.isInteger(order.shares) || order.shares <= 0) return 'invalidShares';
  if (!quote) return 'notTradable';
  const held = state.positions[order.ticker]?.shares ?? 0;
  const delta = order.side === 'buy' ? order.shares : -order.shares;
  if (held !== 0 && Math.sign(delta) !== Math.sign(held) && Math.abs(delta) > Math.abs(held))
    return 'crossesZero';
  if (delta < 0 && held <= 0 && !state.settings.allowShort) return 'shortNotAllowed';
  return null;
}

/** `refusedAs` is the command a refusal reports (a flatten reports itself). */
function applyMarketOrder(
  state: RunState,
  timeline: MarketTimeline,
  order: MarketOrderCommand,
  refusedAs: Command,
): RunStep {
  const quote = tradeQuote(timeline, order.ticker, state.cursor);
  const reason = refusalOf(state, order, quote);
  if (reason || !quote) return refuse(state, refusedAs, reason ?? 'notTradable');

  const price = order.side === 'buy' ? quote.ask : quote.bid;
  const delta = order.side === 'buy' ? order.shares : -order.shares;
  const held = state.positions[order.ticker];
  const events: RunEvent[] = [];

  // The trade this fill belongs to: the open one, or a new one from flat.
  let trade: Trade;
  let nextTradeId = state.nextTradeId;
  if (held) {
    trade = state.trades.find((t) => t.id === held.tradeId)!;
  } else {
    trade = {
      id: nextTradeId++,
      ticker: order.ticker,
      side: delta > 0 ? 'long' : 'short',
      fillIds: [],
      openedAt: state.cursor,
      closedAt: null,
      realizedPnl: 0,
    };
  }

  const fill: Fill = {
    id: state.nextFillId,
    ticker: order.ticker,
    side: order.side,
    shares: order.shares,
    price,
    at: state.cursor,
    tradeId: trade.id,
  };

  let position: Position | null;
  let realized = 0;
  if (!held) {
    position = {
      ticker: order.ticker,
      shares: delta,
      costBasis: delta * price,
      tradeId: trade.id,
      openedAt: state.cursor,
    };
  } else if (Math.sign(delta) === Math.sign(held.shares)) {
    position = { ...held, shares: held.shares + delta, costBasis: held.costBasis + delta * price };
  } else {
    // Closing `closed` shares (signed like the position): the removed basis is
    // floored and the remainder stays with the shares left, so P&L sums exactly.
    const closed = -delta;
    const removed = Math.floor((held.costBasis * closed) / held.shares);
    realized = closed * price - removed;
    const shares = held.shares + delta;
    position = shares === 0 ? null : { ...held, shares, costBasis: held.costBasis - removed };
  }

  const updatedTrade: Trade = {
    ...trade,
    fillIds: [...trade.fillIds, fill.id],
    realizedPnl: trade.realizedPnl + realized,
    closedAt: position ? null : state.cursor,
  };

  const positions = { ...state.positions };
  if (position) positions[order.ticker] = position;
  else delete positions[order.ticker];

  const trades = held
    ? state.trades.map((t) => (t.id === trade.id ? updatedTrade : t))
    : [...state.trades, updatedTrade];

  events.push({ type: 'fill', fill });
  if (!held) events.push({ type: 'tradeOpened', trade: updatedTrade });
  if (!position) events.push({ type: 'tradeClosed', trade: updatedTrade });

  return {
    state: {
      ...state,
      cash: state.cash - delta * price,
      positions,
      trades,
      fills: [...state.fills, fill],
      nextFillId: state.nextFillId + 1,
      nextTradeId,
    },
    events,
  };
}
