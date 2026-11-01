import type { Level } from '../chart/tools';
import type { MarketTimeline, Shares, Ticker } from '../market/types';
import { holdingCard } from './holding';
import { tradeQuote } from './quote';
import { account } from './reducer';
import type {
  Account,
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
  return {
    order: quote ? orderPanel(input, acc, quote) : null,
    // #25: HOLDING card for the selected stock.
    holding: held && quote ? holdingCard(held, quote, run.cursor, input.level) : null,
    // #28: battle log rows (open trades first, then closed).
    battleLog: { rows: [], totalRealized: acc.realizedPnl },
    // #27: ▲ / ▼ markers for the ticker switcher.
    markers: markersOf(run),
    // #29: end-of-market summary.
    endSummary: null,
    bankroll: { equity: acc.equity, openPnl: acc.openPnl },
  };
}

/** A ▲ / ▼ per ticker with a position; flat tickers have none. */
function markersOf(run: RunState): Partial<Record<Ticker, PositionMarker>> {
  const markers: Partial<Record<Ticker, PositionMarker>> = {};
  for (const p of Object.values(run.positions)) markers[p.ticker] = p.shares > 0 ? 'long' : 'short';
  return markers;
}

function orderPanel(input: TradingViewInput, acc: Account, quote: TradeQuote): OrderPanel {
  const { run, ticker, orderShares } = input;
  const defaultShares = roundDown((acc.equity * DEFAULT_SIZE_PCT) / 100 / quote.ask);
  const maxShares = roundDown(acc.buyingPower / quote.ask);
  const requested = roundDown(orderShares ?? defaultShares);
  const shares = Math.min(maxShares, Math.max(ORDER_STEP, requested));
  const cost = shares * quote.ask;
  const held = run.positions[ticker]?.shares ?? 0;

  const buttons: OrderButton[] = [
    {
      id: 'buy',
      key: 'B',
      label: `BUY ${shares} ${ticker}`,
      intent: { type: 'marketOrder', ticker, side: 'buy', shares },
      // #24: every refusal the engine would give, with its reason.
      disabledReason: shares > 0 ? null : 'insufficientBuyingPower',
    },
  ];
  // #26: the Lv7+ variants (SHORT, SELL n, COVER n, FLATTEN) branch here on the level.
  if (held > 0) {
    buttons.push({
      id: 'sellAll',
      key: 'S',
      label: 'SELL ALL',
      intent: { type: 'marketOrder', ticker, side: 'sell', shares: held },
      disabledReason: null,
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
