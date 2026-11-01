import { describe, expect, it } from 'vitest';
import type { Level } from '../chart/tools';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { MarketTimeline } from '../market/types';
import { apply, newRun, runSettingsFor } from './reducer';
import type { Command, RunState } from './types';
import { tradingView } from './view';

// A flat market: OMNX at $65.00 on every bar (6 bps → bid 64.98, ask 65.02).
const real = generateMarketTimeline(48213);
const timeline: MarketTimeline = {
  ...real,
  stocks: real.stocks.map((s) =>
    s.info.ticker === 'OMNX' ? { ...s, bars: s.bars.map((b) => ({ ...b, c: 6500 })) } : s,
  ),
};

const runAt = (level: Level) => newRun(timeline, runSettingsFor(level));
function bought(level: Level, shares: number): RunState {
  const run = runAt(level);
  const at = run.cursor;
  return apply(run, timeline, { type: 'marketOrder', at, ticker: 'OMNX', side: 'buy', shares })
    .state;
}
const view = (run: RunState, level: Level, orderShares: number | null = null, ticker = 'OMNX') =>
  tradingView({ timeline, run, level, ticker, orderShares });

describe('tradingView: ORDER panel at Lv1–6', () => {
  it('defaults to 10% of equity at the ask, rounded down to 10 shares', () => {
    // $100,000 × 10% / $65.02 = 153.8 → 150 shares.
    const order = view(runAt(1), 1).order!;
    expect(order).toMatchObject({ ticker: 'OMNX', defaultShares: 150, shares: 150, step: 10 });
    expect(order.cost).toBe(975_300);
    expect(order.costPctOfAccount).toBeCloseTo(9.753, 6);
  });

  it('shows only BUY n [B] when flat', () => {
    for (const level of [1, 6] as const) {
      expect(view(runAt(level), level, 300).order!.buttons).toEqual([
        {
          id: 'buy',
          key: 'B',
          label: 'BUY 300 OMNX',
          intent: { type: 'marketOrder', ticker: 'OMNX', side: 'buy', shares: 300 },
          disabledReason: null,
        },
      ]);
    }
  });

  it('adds SELL ALL [S] when long, selling every share at the bid', () => {
    const order = view(bought(1, 230), 1, 100).order!;
    expect(order.buttons.map((b) => [b.id, b.key, b.label])).toEqual([
      ['buy', 'B', 'BUY 100 OMNX'],
      ['sellAll', 'S', 'SELL ALL'],
    ]);
    expect(order.buttons[1]!.intent).toEqual({
      type: 'marketOrder',
      ticker: 'OMNX',
      side: 'sell',
      shares: 230,
    });
  });

  it('rounds the stepper down to 10 shares and caps it at buying power', () => {
    expect(view(runAt(1), 1, 155).order!.shares).toBe(150);
    // $100,000 / $65.02 = 1537.9 → 1530 shares at most.
    const capped = view(runAt(1), 1, 5000).order!;
    expect(capped.maxShares).toBe(1530);
    expect(capped.shares).toBe(1530);
  });

  it('caps the stepper at an order the engine fills', () => {
    const order = view(runAt(1), 1, 5000).order!;
    const run = runAt(1);
    const { events } = apply(run, timeline, {
      ...order.buttons[0]!.intent,
      at: run.cursor,
    } as Command);
    expect(events[0]).toMatchObject({ type: 'fill', fill: { shares: 1530 } });
    expect(order.buttons[0]!.disabledReason).toBeNull();
  });

  it('disables BUY with "insufficientBuyingPower" once buying power is spent, but not SELL ALL', () => {
    // 1530 × $65.02 spent; $519.40 of buying power left, under one step at the ask.
    const order = view(bought(1, 1530), 1).order!;
    expect(order.maxShares).toBe(0);
    expect(order.shares).toBe(0);
    expect(order.buttons.map((b) => [b.id, b.disabledReason])).toEqual([
      ['buy', 'insufficientBuyingPower'],
      ['sellAll', null],
    ]);
  });

  it('has no ORDER panel for the index', () => {
    expect(view(runAt(1), 1, null, 'TYX').order).toBeNull();
  });
});

describe('tradingView: ticker switcher markers', () => {
  it('has no marker when flat', () => {
    expect(view(runAt(7), 7).markers).toEqual({});
  });

  it('marks a long position, whichever ticker is selected', () => {
    expect(view(bought(1, 300), 1).markers).toEqual({ OMNX: 'long' });
    expect(view(bought(1, 300), 1, null, 'KRVX').markers).toEqual({ OMNX: 'long' });
  });

  it('marks a short next to a long (hand-built run)', () => {
    const run = bought(7, 300);
    const withShort: RunState = {
      ...run,
      positions: {
        ...run.positions,
        KRVX: {
          ticker: 'KRVX',
          shares: -100,
          costBasis: -500_000,
          tradeId: 2,
          openedAt: run.cursor,
        },
      },
    };
    expect(view(withShort, 7).markers).toEqual({ OMNX: 'long', KRVX: 'short' });
  });
});

describe('tradingView: BANKROLL', () => {
  it('shows the starting balance when flat', () => {
    expect(view(runAt(1), 1).bankroll).toEqual({ equity: 10_000_000, openPnl: 0 });
  });

  it('shows equity and open P&L at the mid: minus the half spread right after a buy', () => {
    // 300 shares bought at 65.02, valued at 65.00: −$6.00.
    expect(view(bought(1, 300), 1).bankroll).toEqual({ equity: 9_999_400, openPnl: -600 });
  });
});
