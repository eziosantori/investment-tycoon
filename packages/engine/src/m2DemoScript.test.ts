// M2 demo script at the engine level (the visual part is checked by hand on
// `pnpm build && pnpm preview` at `?seed=48213&level=7`): buy KRVX, watch the
// open P&L move, switch to OMNX, short it, flatten both. The orders go through
// the trading view's buttons, as a click or a key would.
import { describe, expect, it } from 'vitest';
import { nextWeekClose } from './cursor';
import { generateMarketTimeline } from './market/marketTimeline';
import type { Ticker } from './market/types';
import { account, advanceTo, apply, newRun, replay, runSettingsFor } from './run/reducer';
import type { Command, OrderButtonId, RunState } from './run/types';
import { tradingView } from './run/view';

const SEED = 48213;
const LEVEL = 7;
const timeline = generateMarketTimeline(SEED);
const settings = runSettingsFor(LEVEL);

describe('M2 demo script (seed 48213, Lv7)', () => {
  it('buys KRVX, shorts OMNX, flattens both: two closed trades, equity − start = realized', () => {
    let run = newRun(timeline, settings);
    const log: Command[] = [];

    const click = (ticker: Ticker, id: OrderButtonId) => {
      const view = tradingView({ timeline, run, level: LEVEL, ticker, orderShares: null });
      const button = view.order!.buttons.find((b) => b.id === id)!;
      expect(button.disabledReason).toBeNull();
      const command = { ...button.intent, at: run.cursor } as Command;
      const step = apply(run, timeline, command);
      expect(step.events.some((e) => e.type === 'refused')).toBe(false);
      log.push(command);
      run = step.state;
    };
    const playWeek = () => {
      run = advanceTo(run, timeline, nextWeekClose(timeline, run.cursor)).state;
    };
    const ledgerBalances = (r: RunState) => {
      const a = account(r, timeline);
      expect(a.equity - settings.startingBalance).toBe(a.realizedPnl + a.openPnl);
      return a;
    };

    // Buy KRVX at the default size: open P&L starts at minus the half spread.
    click('KRVX', 'buy');
    const krvx = run.positions['KRVX']!;
    expect(krvx.shares).toBeGreaterThan(0);
    expect(ledgerBalances(run).openPnl).toBeLessThan(0);

    // Watch the open P&L move.
    const openPnlBefore = ledgerBalances(run).openPnl;
    playWeek();
    expect(ledgerBalances(run).openPnl).not.toBe(openPnlBefore);

    // Switch to OMNX and short it; both markers show.
    click('OMNX', 'short');
    expect(run.positions['OMNX']!.shares).toBeLessThan(0);
    const both = tradingView({ timeline, run, level: LEVEL, ticker: 'OMNX', orderShares: null });
    expect(both.markers).toEqual({ KRVX: 'long', OMNX: 'short' });
    expect(both.holding?.label).toBe('SHORT');
    expect(both.battleLog.rows.map((r) => [r.ticker, r.live])).toEqual([
      ['OMNX', true],
      ['KRVX', true],
    ]);

    playWeek();
    ledgerBalances(run);

    // Flatten both.
    click('OMNX', 'flatten');
    click('KRVX', 'flatten');
    expect(run.positions).toEqual({});

    const view = tradingView({ timeline, run, level: LEVEL, ticker: 'KRVX', orderShares: null });
    expect(view.holding).toBeNull();
    expect(view.markers).toEqual({});
    expect(view.battleLog.rows.map((r) => [r.tradeId, r.ticker, r.side, r.live])).toEqual([
      [2, 'OMNX', 'short', false],
      [1, 'KRVX', 'long', false],
    ]);
    expect(run.trades.every((t) => t.closedAt === run.cursor)).toBe(true);

    const final = ledgerBalances(run);
    expect(final.openPnl).toBe(0);
    expect(final.equity - settings.startingBalance).toBe(final.realizedPnl);
    expect(view.battleLog.totalRealized).toBe(final.realizedPnl);
    expect(view.bankroll.equity).toBe(final.equity);

    // The seed and the command log rebuild the same run.
    expect(replay(generateMarketTimeline(SEED), settings, log, run.cursor)).toEqual(run);
  });
});
