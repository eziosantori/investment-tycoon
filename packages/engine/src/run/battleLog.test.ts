import { describe, expect, it } from 'vitest';
import type { Level } from '../chart/tools';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { MarketTimeline } from '../market/types';
import { advanceTo, apply, newRun, runSettingsFor } from './reducer';
import type { RunState, Side } from './types';
import { tradingView } from './view';

// A scripted market around the start cursor S. OMNX (6 bps): $65.00 up to S,
// $70.00 for the next week (S+1 … S+30), then $60.00. KRVX (10 bps): $40.00.
const real = generateMarketTimeline(48213);
const S = newRun(real, runSettingsFor(1)).cursor;
const omnx = (bar: number) => (bar <= S ? 6500 : bar <= S + 30 ? 7000 : 6000);
const timeline: MarketTimeline = {
  ...real,
  stocks: real.stocks.map((s) =>
    s.info.ticker === 'OMNX'
      ? { ...s, bars: s.bars.map((b, i) => ({ ...b, c: omnx(i) })) }
      : s.info.ticker === 'KRVX'
        ? { ...s, bars: s.bars.map((b) => ({ ...b, c: 4000 })) }
        : s,
  ),
};

/** A tiny script: `at` advances, `order` trades at the cursor. */
class Script {
  run: RunState;
  constructor(level: Level = 1) {
    this.run = newRun(timeline, runSettingsFor(level));
  }
  at(bar: number) {
    this.run = advanceTo(this.run, timeline, bar).state;
    return this;
  }
  order(side: Side, shares: number, ticker = 'OMNX') {
    const step = apply(this.run, timeline, {
      type: 'marketOrder',
      at: this.run.cursor,
      ticker,
      side,
      shares,
    });
    expect(step.events.some((e) => e.type === 'refused')).toBe(false);
    this.run = step.state;
    return this;
  }
  battleLog(level: Level = 1) {
    return tradingView({ timeline, run: this.run, level, ticker: 'OMNX', orderShares: null })
      .battleLog;
  }
}

describe('tradingView: battle log', () => {
  it('is empty with no realized P&L before the first fill', () => {
    expect(new Script().battleLog()).toEqual({ rows: [], totalRealized: 0 });
  });

  it('shows an open trade as a live row with its current P&L and no exit', () => {
    // 100 bought at the ask 65.02, valued a week later at the mid 70.00.
    const log = new Script()
      .order('buy', 100)
      .at(S + 30)
      .battleLog();
    expect(log.rows).toEqual([
      {
        tradeId: 1,
        ticker: 'OMNX',
        side: 'long',
        shares: 100,
        avgEntry: 6502,
        avgExit: null,
        pnl: 49_800,
        pnlPct: expect.closeTo((49_800 / 650_200) * 100, 9),
        duration: { value: 1, unit: 'weeks' },
        live: true,
      },
    ]);
    expect(log.totalRealized).toBe(0);
  });

  it('keeps scaling in and out inside one trade, with volume-weighted entry and exit', () => {
    // Buy 100 @ 65.02, a week later buy 100 @ 70.03 and sell 150 @ 69.97,
    // next bar sell the last 50 @ 59.98 (mid 60.00).
    const log = new Script()
      .order('buy', 100)
      .at(S + 30)
      .order('buy', 100)
      .order('sell', 150)
      .at(S + 31)
      .order('sell', 50)
      .battleLog();
    expect(log.rows).toEqual([
      {
        tradeId: 1,
        ticker: 'OMNX',
        side: 'long',
        shares: 200,
        avgEntry: 6752.5,
        avgExit: 6747.25,
        // 1,349,450 out − 1,350,500 in.
        pnl: -1050,
        pnlPct: expect.closeTo((-1050 / 1_350_500) * 100, 9),
        duration: { value: 1, unit: 'weeks' },
        live: false,
      },
    ]);
    expect(log.totalRealized).toBe(-1050);
  });

  it('shows a short trade with the entry at the bid and the exit at the ask', () => {
    // Short 100 @ 64.98, cover a week later @ 70.03.
    const log = new Script(7)
      .order('sell', 100)
      .at(S + 30)
      .order('buy', 100)
      .battleLog(7);
    expect(log.rows[0]).toMatchObject({
      side: 'short',
      shares: 100,
      avgEntry: 6498,
      avgExit: 7003,
      pnl: -50_500,
      live: false,
    });
    expect(log.rows[0]!.pnlPct).toBeCloseTo((-50_500 / 649_800) * 100, 9);
  });

  it('lists live trades first, then closed ones newest first', () => {
    const log = new Script()
      .order('buy', 10, 'KRVX') // #1, stays open
      .order('buy', 10) // #2
      .at(S + 6)
      .order('sell', 10)
      .order('buy', 20) // #3
      .at(S + 12)
      .order('sell', 20)
      .battleLog();
    expect(log.rows.map((r) => [r.tradeId, r.live])).toEqual([
      [1, true],
      [3, false],
      [2, false],
    ]);
    // Realized: #2 sells 10 @ 69.97 bought @ 65.02; #3 round trip 70.03 → 69.97.
    expect(log.totalRealized).toBe(10 * (6997 - 6502) + 20 * (6997 - 7003));
  });

  it('counts durations in sessions below a week, in weeks from a week', () => {
    const durations = (bars: number) =>
      new Script()
        .order('buy', 10, 'KRVX')
        .at(S + bars)
        .battleLog().rows[0]!.duration;
    expect(durations(0)).toEqual({ value: 0, unit: 'sessions' });
    expect(durations(12)).toEqual({ value: 2, unit: 'sessions' });
    expect(durations(29)).toEqual({ value: 4, unit: 'sessions' });
    expect(durations(30)).toEqual({ value: 1, unit: 'weeks' });
    expect(durations(65)).toEqual({ value: 2, unit: 'weeks' });
  });
});
