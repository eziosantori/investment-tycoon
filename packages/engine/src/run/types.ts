/**
 * The M2 run contract (ADR-0005, spec #19). Every M2 module builds on these
 * types: the run reducer (`./reducer`: `newRun`, `advanceTo`, `apply`,
 * `replay`, `account`) changes a `RunState` against the market timeline, the
 * quote (`./quote`) prices orders, the trading view (`./view`) turns a run
 * into what the trading panels show. Vocabulary: GLOSSARY.md, section Trading.
 *
 * Money is integer cents, shares integer; average prices and percentages are
 * derived floats, never stored.
 */
import type { Cents, Cursor, Shares, Ticker } from '../market/types';

/** Direction of an order or a fill. */
export type Side = 'buy' | 'sell';

/** Direction of a position or a trade. */
export type PositionSide = 'long' | 'short';

/** What a run allows; the app derives them from the level (`runSettingsFor`). */
export interface RunSettings {
  /** The equity a run starts with ($100,000). */
  startingBalance: Cents;
  /** Whether opening or adding to a short is allowed (from Lv7). */
  allowShort: boolean;
}

/** The player's shares in one stock; at most one per stock, never zero shares. */
export interface Position {
  ticker: Ticker;
  /** Signed: > 0 long, < 0 short. */
  shares: Shares;
  /**
   * What the current shares cost, signed like `shares` (a short's basis is its
   * proceeds, negative). Open P&L = shares × mid − costBasis.
   */
  costBasis: Cents;
  /** The trade this position belongs to. */
  tradeId: number;
  /** The bar the position was opened at (flat → not flat). */
  openedAt: Cursor;
}

/** One executed market order. No commissions: there is no fee. */
export interface Fill {
  /** Sequential from 1 within a run. */
  id: number;
  ticker: Ticker;
  side: Side;
  /** Positive. */
  shares: Shares;
  /** The ask for a buy, the bid for a sell. */
  price: Cents;
  at: Cursor;
  tradeId: number;
}

/**
 * A round trip in one stock, from flat back to flat. Adding and trimming stay
 * inside the same trade. Entry and exit prices are derived from its fills.
 */
export interface Trade {
  /** Sequential from 1 within a run; the battle log's "#". */
  id: number;
  ticker: Ticker;
  side: PositionSide;
  /** The trade's fills, in order. */
  fillIds: number[];
  openedAt: Cursor;
  /** `null` while the trade is open. */
  closedAt: Cursor | null;
  /** P&L locked in by the shares closed so far. */
  realizedPnl: Cents;
}

/** The run: a plain serializable object, read against the market timeline. */
export interface RunState {
  /** The last revealed bar; the one source of truth for where the run is. */
  cursor: Cursor;
  /** Money not tied up in positions; short sale proceeds are added to it. */
  cash: Cents;
  /** Open positions by ticker. */
  positions: Record<Ticker, Position>;
  /** Every trade of the run, open and closed, in the order they opened. */
  trades: Trade[];
  /** Every fill of the run, in order. */
  fills: Fill[];
  nextFillId: number;
  nextTradeId: number;
  settings: RunSettings;
}

/** A market order: fills now at the ask (buy) or the bid (sell). */
export interface MarketOrderCommand {
  type: 'marketOrder';
  /** The bar it was issued at (the cursor when applied). */
  at: Cursor;
  ticker: Ticker;
  side: Side;
  /** Positive integer. */
  shares: Shares;
}

/** Closes the whole position in a stock with a market order. */
export interface FlattenCommand {
  type: 'flatten';
  at: Cursor;
  ticker: Ticker;
}

/** One player action, stamped with its bar. Time advances are never commands. */
export type Command = MarketOrderCommand | FlattenCommand;

/** A command before it is stamped with the cursor: what a button or key asks for. */
export type CommandIntent = Omit<MarketOrderCommand, 'at'> | Omit<FlattenCommand, 'at'>;

/** Why a command was refused. A refused command changes nothing but emits an event. */
export type RefusalReason =
  /** Exposure after the fill would exceed equity. */
  | 'insufficientBuyingPower'
  /** Opening or adding to a short while the run forbids it. */
  | 'shortNotAllowed'
  /** The order would take the position past zero (no flip in one order). */
  | 'crossesZero'
  /** The last bar of the market has been reached. */
  | 'marketEnded'
  /** The instrument has no quote: the index, or an unknown ticker. */
  | 'notTradable'
  /** Shares not a positive integer. */
  | 'invalidShares'
  /** The command's bar is not the run's cursor. */
  | 'wrongBar'
  /** Flatten with no position in the stock. */
  | 'noPosition';

export type RunEvent =
  | { type: 'fill'; fill: Fill }
  | { type: 'tradeOpened'; trade: Trade }
  | { type: 'tradeClosed'; trade: Trade }
  | { type: 'refused'; command: Command; reason: RefusalReason };

/** What `advanceTo` and `apply` return. */
export interface RunStep {
  state: RunState;
  events: RunEvent[];
}

/** A stock's prices at the cursor. Rounding always goes against the player. */
export interface TradeQuote {
  ticker: Ticker;
  /** Close of the bar at the cursor. */
  mid: Cents;
  /** mid − half spread, rounded down; at least 1 cent under the mid. */
  bid: Cents;
  /** mid + half spread, rounded up; at least 1 cent over the mid. */
  ask: Cents;
  spreadBps: number;
}

/** The account valued at the mid of the bar at the cursor. */
export interface Account {
  cash: Cents;
  /** cash + Σ shares × mid. */
  equity: Cents;
  /** Σ (shares × mid − costBasis). */
  openPnl: Cents;
  /** Σ realized P&L of every trade, open and closed. */
  realizedPnl: Cents;
  /** Σ |shares| × mid. */
  exposure: Cents;
  /** equity − exposure. */
  buyingPower: Cents;
}

// ---------- trading view: what the trading panels show ----------

/** The keycap on an order button; the same key triggers it. */
export type OrderKey = 'B' | 'S' | 'F';

export type OrderButtonId = 'buy' | 'sellAll' | 'sell' | 'short' | 'cover' | 'flatten';

export interface OrderButton {
  id: OrderButtonId;
  key: OrderKey;
  /** Exactly what it does, e.g. "BUY 300 OMNX", "SELL ALL". */
  label: string;
  /** The command a click (or the key) dispatches. */
  intent: CommandIntent;
  /** Set when the order would be refused: the button is disabled with this reason. */
  disabledReason: RefusalReason | null;
}

/**
 * ORDER panel for the selected stock. Variants: Lv1–6 flat → BUY; long → BUY
 * + SELL ALL. Lv7+ flat → BUY + SHORT; long → BUY + SELL n + FLATTEN; short →
 * COVER n + SHORT n + FLATTEN.
 */
export interface OrderPanel {
  ticker: Ticker;
  quote: TradeQuote;
  /** The stepper's value, after clamping to `[0, maxShares]` in steps of `step`. */
  shares: Shares;
  /** floor(10% of equity / ask), rounded down to `step`. */
  defaultShares: Shares;
  step: Shares;
  /** Highest stepper value buying power allows (rounded down to `step`). */
  maxShares: Shares;
  /** shares × ask: "Cost ≈ $X". */
  cost: Cents;
  /** cost / equity × 100: "Y% of account". */
  costPctOfAccount: number;
  /** Visible buttons, left to right. Controls that can't apply are absent. */
  buttons: OrderButton[];
}

/** BANKROLL card. */
export interface Bankroll {
  equity: Cents;
  openPnl: Cents;
}

/** A span of the run, in weeks (sessions below a week). */
export interface Duration {
  value: number;
  unit: 'weeks' | 'sessions';
}

/** HOLDING card for the selected stock; absent when flat. */
export interface HoldingCard {
  /** HOLDING at Lv1–6, LONG / SHORT from Lv7. */
  label: 'HOLDING' | 'LONG' | 'SHORT';
  side: PositionSide;
  /** Positive. */
  shares: Shares;
  ticker: Ticker;
  /** |costBasis| / |shares|, in cents (derived float). */
  avgPrice: number;
  openPnl: Cents;
  /** openPnl / |costBasis| × 100. */
  openPnlPct: number;
  held: Duration;
}

/** One row of the battle log: a trade, open ("live") or closed. */
export interface BattleLogRow {
  tradeId: number;
  ticker: Ticker;
  side: PositionSide;
  /** Peak |shares| of the trade. */
  shares: Shares;
  /** Volume-weighted entry price, in cents (derived float). */
  avgEntry: number;
  /** Volume-weighted exit price; `null` for a live row. */
  avgExit: number | null;
  /** Realized P&L, plus open P&L for a live row. */
  pnl: Cents;
  pnlPct: number;
  duration: Duration;
  live: boolean;
}

export interface BattleLog {
  /** Open trades first, then closed ones, newest first. */
  rows: BattleLogRow[];
  /** Realized P&L of the run. */
  totalRealized: Cents;
}

/** Ticker switcher marker: ▲ long, ▼ short. */
export type PositionMarker = PositionSide;

export interface OpenPositionSummary {
  ticker: Ticker;
  side: PositionSide;
  shares: Shares;
  mid: Cents;
  openPnl: Cents;
}

/** End-of-market overlay. */
export interface EndSummary {
  finalEquity: Cents;
  realizedPnl: Cents;
  /** Closed and open trades of the run. */
  trades: number;
  /** Positions still open, valued at the final mid. */
  openPositions: OpenPositionSummary[];
}

export interface TradingView {
  /** `null` for an instrument that can't be traded (the index). */
  order: OrderPanel | null;
  holding: HoldingCard | null;
  bankroll: Bankroll;
  battleLog: BattleLog;
  markers: Partial<Record<Ticker, PositionMarker>>;
  /** Set once the market has ended. */
  endSummary: EndSummary | null;
}
