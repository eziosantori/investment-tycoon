import type { Level } from '../chart/tools';
import type { MarketTimeline, Shares, Ticker } from '../market/types';
import { tradeQuote } from './quote';
import { account, orderRefusal } from './reducer';
import type {
  Account,
  MarketOrderCommand,
  OrderButton,
  OrderPanel,
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
  return {
    order: quote ? orderPanel(input, acc, quote) : null,
    // #25: HOLDING card for the selected stock.
    holding: null,
    // #28: battle log rows (open trades first, then closed).
    battleLog: { rows: [], totalRealized: acc.realizedPnl },
    // #27: ▲ / ▼ markers for the ticker switcher.
    markers: {},
    // #29: end-of-market summary.
    endSummary: null,
    bankroll: { equity: acc.equity, openPnl: acc.openPnl },
  };
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
  const buttons: OrderButton[] = [
    {
      id: 'buy',
      key: 'B',
      label: `BUY ${shares} ${ticker}`,
      intent: buyIntent,
      disabledReason: refusal(buyIntent),
    },
  ];
  // #26: the Lv7+ variants (SHORT, SELL n, COVER n, FLATTEN) branch here on the level.
  if (held > 0) {
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
