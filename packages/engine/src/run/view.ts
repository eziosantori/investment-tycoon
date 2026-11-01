import type { Level } from '../chart/tools';
import { isAtEnd } from '../cursor';
import type { MarketTimeline, Shares, Ticker } from '../market/types';
import { battleLog } from './battleLog';
import { holdingCard } from './holding';
import { tradeQuote } from './quote';
import { account, orderRefusal, SHORT_UNLOCK_LEVEL } from './reducer';
import type {
  Account,
  EndSummary,
  MarketOrderCommand,
  OrderButton,
  OrderPanel,
  PositionMarker,
  RunState,
  TradeQuote,
  TradingView,
} from './types';

export interface TradingViewInput {
  timeline: MarketTimeline;
  run: RunState;
  level: Level;
  /** The selected ticker (the chart's instrument). */
  ticker: Ticker;
  /** The stepper's value; `null` for the default size. */
  orderShares: Shares | null;
}

/** The stepper moves by 10 shares. */
export const ORDER_STEP: Shares = 10;

/** Default order size: this share of equity at the ask. */
const DEFAULT_SIZE_PCT = 10;

const roundDown = (shares: number) => Math.max(0, Math.floor(shares / ORDER_STEP) * ORDER_STEP);

/**
 * What the trading panels show (spec #19, "Trading view"): pure, like the
 * chart view, so React only lays it out.
 */
export function tradingView(input: TradingViewInput): TradingView {
  const { timeline, run, ticker } = input;
  const acc = account(run, timeline);
  const quote = tradeQuote(timeline, ticker, run.cursor);
  const held = run.positions[ticker];
  const ended = isAtEnd(timeline, run.cursor);
  return {
    // No order buttons once the market has ended: every order would be refused.
    order: quote && !ended ? orderPanel(input, acc, quote) : null,
    // #25: HOLDING card for the selected stock.
    holding: held && quote ? holdingCard(held, quote, run.cursor, input.level) : null,
    battleLog: battleLog(run, timeline, acc.realizedPnl),
    // #27: ▲ / ▼ markers for the ticker switcher.
    markers: markersOf(run),
    endSummary: ended ? endSummaryOf(run, timeline, acc) : null,
    bankroll: { equity: acc.equity, openPnl: acc.openPnl },
  };
}

/** The run's closing numbers; open positions stay valued at the final mid (no auto-flatten). */
function endSummaryOf(run: RunState, timeline: MarketTimeline, acc: Account): EndSummary {
  return {
    finalEquity: acc.equity,
    realizedPnl: acc.realizedPnl,
    trades: run.trades.length,
    openPositions: Object.values(run.positions).map((p) => {
      const mid = tradeQuote(timeline, p.ticker, run.cursor)?.mid ?? 0;
      return {
        ticker: p.ticker,
        side: p.shares > 0 ? 'long' : 'short',
        shares: Math.abs(p.shares),
        mid,
        openPnl: p.shares * mid - p.costBasis,
      };
    }),
  };
}

/** A ▲ / ▼ per ticker with a position; flat tickers have none. */
function markersOf(run: RunState): Partial<Record<Ticker, PositionMarker>> {
  const markers: Partial<Record<Ticker, PositionMarker>> = {};
  for (const p of Object.values(run.positions)) markers[p.ticker] = p.shares > 0 ? 'long' : 'short';
  return markers;
}

function orderPanel(input: TradingViewInput, acc: Account, quote: TradeQuote): OrderPanel {
  const { timeline, run, ticker, orderShares } = input;
  /** A button is disabled with the reason the engine would refuse its order. */
  const refusal = (intent: Omit<MarketOrderCommand, 'at'>) =>
    intent.shares > 0 ? orderRefusal(run, timeline, intent) : 'insufficientBuyingPower';
  const defaultShares = roundDown((acc.equity * DEFAULT_SIZE_PCT) / 100 / quote.ask);
  const maxShares = roundDown(acc.buyingPower / quote.ask);
  const requested = roundDown(orderShares ?? defaultShares);
  const shares = Math.min(maxShares, Math.max(ORDER_STEP, requested));
  const cost = shares * quote.ask;
  const held = run.positions[ticker]?.shares ?? 0;

  const buyIntent = { type: 'marketOrder', ticker, side: 'buy', shares } as const;
  let buttons: OrderButton[] = [
    {
      id: 'buy',
      key: 'B',
      label: `BUY ${shares} ${ticker}`,
      intent: buyIntent,
      disabledReason: refusal(buyIntent),
    },
  ];
  if (input.level >= SHORT_UNLOCK_LEVEL) {
    buttons = proButtons(ticker, shares, held, buttons[0]!, refusal);
  } else if (held > 0) {
    const sellAll = { type: 'marketOrder', ticker, side: 'sell', shares: held } as const;
    buttons.push({
      id: 'sellAll',
      key: 'S',
      label: 'SELL ALL',
      intent: sellAll,
      disabledReason: refusal(sellAll),
    });
  }

  return {
    ticker,
    quote,
    shares,
    defaultShares,
    step: ORDER_STEP,
    maxShares,
    cost,
    costPctOfAccount: acc.equity > 0 ? (cost / acc.equity) * 100 : 0,
    buttons,
  };
}

/**
 * The Lv7+ variants: flat → BUY n + SHORT n; long → BUY n + SELL n + FLATTEN;
 * short → COVER n + SHORT n + FLATTEN. SELL and COVER are capped at the
 * position, so one order never takes it past zero and the label is the real number.
 */
function proButtons(
  ticker: Ticker,
  shares: Shares,
  held: Shares,
  buy: OrderButton,
  refusal: (intent: Omit<MarketOrderCommand, 'at'>) => OrderButton['disabledReason'],
): OrderButton[] {
  const closing = Math.min(Math.abs(held), Math.max(ORDER_STEP, shares));
  const close = (id: 'sell' | 'cover', key: 'B' | 'S', side: 'buy' | 'sell'): OrderButton => {
    const intent = { type: 'marketOrder', ticker, side, shares: closing } as const;
    return {
      id,
      key,
      label: `${id.toUpperCase()} ${closing} ${ticker}`,
      intent,
      disabledReason: refusal(intent),
    };
  };
  const shortIntent = { type: 'marketOrder', ticker, side: 'sell', shares } as const;
  const short: OrderButton = {
    id: 'short',
    key: 'S',
    label: `SHORT ${shares} ${ticker}`,
    intent: shortIntent,
    disabledReason: refusal(shortIntent),
  };
  const flatten: OrderButton = {
    id: 'flatten',
    key: 'F',
    label: 'FLATTEN',
    intent: { type: 'flatten', ticker },
    disabledReason: null,
  };
  if (held > 0) return [buy, close('sell', 'S', 'sell'), flatten];
  if (held < 0) return [close('cover', 'B', 'buy'), short, flatten];
  return [buy, short];
}
