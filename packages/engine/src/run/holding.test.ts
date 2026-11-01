import { describe, expect, it } from 'vitest';
import type { Level } from '../chart/tools';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { MarketTimeline } from '../market/types';
import { advanceTo, apply, newRun, runSettingsFor } from './reducer';
import type { RunState } from './types';
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
function order(level: Level, side: 'buy' | 'sell', shares: number): RunState {
  const run = runAt(level);
  return apply(run, timeline, {
    type: 'marketOrder',
    at: run.cursor,
    ticker: 'OMNX',
    side,
    shares,
  }).state;
}
const advance = (run: RunState, bars: number) => advanceTo(run, timeline, run.cursor + bars).state;
const holding = (run: RunState, level: Level, ticker = 'OMNX') =>
  tradingView({ timeline, run, level, ticker, orderShares: null }).holding;

describe('tradingView: HOLDING card', () => {
  it('is absent when flat in the selected stock, even holding another', () => {
    expect(holding(runAt(1), 1)).toBeNull();
    expect(holding(order(1, 'buy', 100), 1, 'KRVX')).toBeNull();
  });

  it('shows shares, ticker, average price and open P&L, labelled HOLDING at Lv1–6', () => {
    // 300 shares at the ask 65.02, valued at 65.00: −$6.00 on a $19,506 basis.
    const card = holding(order(1, 'buy', 300), 1)!;
    expect(card).toMatchObject({
      label: 'HOLDING',
      side: 'long',
      shares: 300,
      ticker: 'OMNX',
      avgPrice: 6502,
      openPnl: -600,
      held: { value: 1, unit: 'sessions' },
    });
    expect(card.openPnlPct).toBeCloseTo(-0.030758, 5);
  });

  it('is labelled LONG from Lv7', () => {
    expect(holding(order(7, 'buy', 300), 7)!.label).toBe('LONG');
  });

  it('shows a short as SHORT with positive shares and the average sale price', () => {
    // Sold at the bid 64.98, valued at the mid 65.00: −$4.00 on a $12,996 basis.
    const card = holding(order(7, 'sell', 200), 7)!;
    expect(card).toMatchObject({
      label: 'SHORT',
      side: 'short',
      shares: 200,
      avgPrice: 6498,
      openPnl: -400,
    });
    expect(card.openPnlPct).toBeCloseTo(-0.030779, 5);
  });

  it('counts the sessions held, the opening one included, and weeks from five', () => {
    // Opened on the last bar of a session: the next bar is a second session.
    const run = order(1, 'buy', 100);
    expect(holding(advance(run, 1), 1)!.held).toEqual({ value: 2, unit: 'sessions' });
    expect(holding(advance(run, 18), 1)!.held).toEqual({ value: 4, unit: 'sessions' });
    expect(holding(advance(run, 19), 1)!.held).toEqual({ value: 1, unit: 'weeks' });
    expect(holding(advance(run, 65), 1)!.held).toEqual({ value: 2, unit: 'weeks' });
  });
});
