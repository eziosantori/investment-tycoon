import { describe, expect, it } from 'vitest';
import { endCursor, startCursor } from '../cursor';
import { generateMarketTimeline } from '../market/marketTimeline';
import { tradeQuote } from './quote';
import { account, advanceTo, apply, newRun, replay, runSettingsFor } from './reducer';
import type { Command, CommandIntent, RunState } from './types';

const timeline = generateMarketTimeline(48213);
const start = startCursor(timeline);
const lv1 = runSettingsFor(1);
const fresh = () => newRun(timeline, lv1);

/** Issues an intent at the run's cursor, as the app's dispatch does. */
function act(state: RunState, intent: CommandIntent) {
  return apply(state, timeline, { ...intent, at: state.cursor } as Command);
}
const buy = (ticker: string, shares: number) =>
  ({ type: 'marketOrder', ticker, side: 'buy', shares }) as const;
const sell = (ticker: string, shares: number) =>
  ({ type: 'marketOrder', ticker, side: 'sell', shares }) as const;
const quote = (state: RunState, ticker: string) => tradeQuote(timeline, ticker, state.cursor)!;

describe('newRun', () => {
  it('starts at the start cursor with the $100,000 starting balance, flat', () => {
    const run = fresh();
    expect(run.cursor).toBe(start);
    expect(run.cash).toBe(10_000_000);
    expect(run.positions).toEqual({});
    expect(account(run, timeline)).toMatchObject({
      equity: 10_000_000,
      openPnl: 0,
      realizedPnl: 0,
    });
  });

  it('allows shorting from Lv7', () => {
    expect(runSettingsFor(6).allowShort).toBe(false);
    expect(runSettingsFor(7).allowShort).toBe(true);
  });
});

describe('advanceTo', () => {
  it('moves the cursor forward, clamped to the timeline, never back', () => {
    const run = fresh();
    expect(advanceTo(run, timeline, start + 5).state.cursor).toBe(start + 5);
    expect(advanceTo(run, timeline, 10 ** 9).state.cursor).toBe(endCursor(timeline));
    const later = advanceTo(run, timeline, start + 5).state;
    expect(advanceTo(later, timeline, start).state.cursor).toBe(start + 5);
  });
});

describe('apply: market orders', () => {
  it('fills a buy at the ask and takes its value out of cash', () => {
    const run = fresh();
    const { ask } = quote(run, 'OMNX');
    const { state, events } = act(run, buy('OMNX', 300));
    expect(state.cash).toBe(10_000_000 - 300 * ask);
    expect(state.positions.OMNX).toMatchObject({ shares: 300, costBasis: 300 * ask });
    expect(events[0]).toMatchObject({
      type: 'fill',
      fill: { id: 1, ticker: 'OMNX', side: 'buy', shares: 300, price: ask, at: start },
    });
    expect(events[1]).toMatchObject({ type: 'tradeOpened', trade: { id: 1, side: 'long' } });
  });

  it('shows minus the half spread times the shares as open P&L right after a buy', () => {
    const run = fresh();
    const { ask, mid } = quote(run, 'OMNX');
    const { state } = act(run, buy('OMNX', 300));
    expect(account(state, timeline).openPnl).toBe(-(ask - mid) * 300);
    expect(account(state, timeline).equity).toBe(10_000_000 - (ask - mid) * 300);
  });

  it('adds to the same position when buying more of a held stock', () => {
    let run = act(fresh(), buy('OMNX', 300)).state;
    const first = quote(run, 'OMNX').ask;
    run = advanceTo(run, timeline, start + 7).state;
    const second = quote(run, 'OMNX').ask;
    run = act(run, buy('OMNX', 200)).state;
    expect(Object.keys(run.positions)).toEqual(['OMNX']);
    expect(run.positions.OMNX).toMatchObject({
      shares: 500,
      costBasis: 300 * first + 200 * second,
      tradeId: 1,
    });
    expect(run.trades).toHaveLength(1);
  });

  it('closes the position at the bid with SELL ALL and realizes the P&L', () => {
    let run = act(fresh(), buy('OMNX', 300)).state;
    const ask = quote(run, 'OMNX').ask;
    run = advanceTo(run, timeline, start + 30).state;
    const bid = quote(run, 'OMNX').bid;
    const { state, events } = act(run, sell('OMNX', 300));
    expect(state.positions).toEqual({});
    expect(state.cash).toBe(10_000_000 + 300 * (bid - ask));
    expect(state.trades[0]).toMatchObject({
      closedAt: start + 30,
      realizedPnl: 300 * (bid - ask),
      fillIds: [1, 2],
    });
    expect(events.map((e) => e.type)).toEqual(['fill', 'tradeClosed']);
    expect(account(state, timeline)).toMatchObject({
      equity: 10_000_000 + 300 * (bid - ask),
      openPnl: 0,
      realizedPnl: 300 * (bid - ask),
    });
  });

  it('keeps the remainder of the cost basis with the shares left on a partial close', () => {
    let run = act(fresh(), buy('KRVX', 3)).state;
    run = advanceTo(run, timeline, start + 3).state;
    run = act(run, buy('KRVX', 4)).state;
    const basis = run.positions.KRVX!.costBasis;
    run = act(run, sell('KRVX', 2)).state;
    const removed = Math.floor((basis * 2) / 7);
    expect(run.positions.KRVX).toMatchObject({ shares: 5, costBasis: basis - removed });
    expect(Number.isInteger(run.trades[0]!.realizedPnl)).toBe(true);
  });

  it('keeps equity − starting balance = realized + open P&L to the cent on every bar', () => {
    let run = fresh();
    const script: [number, CommandIntent][] = [
      [0, buy('OMNX', 310)],
      [5, buy('KRVX', 170)],
      [11, buy('OMNX', 90)],
      [20, sell('OMNX', 133)],
      [40, sell('KRVX', 170)],
      [70, sell('OMNX', 267)],
      [80, buy('CYGN', 999)],
    ];
    for (const [offset, intent] of script) {
      for (let bar = run.cursor + 1; bar <= start + offset; bar++) {
        run = advanceTo(run, timeline, bar).state;
        const a = account(run, timeline);
        expect(a.equity - 10_000_000).toBe(a.realizedPnl + a.openPnl);
      }
      run = act(run, intent).state;
      const a = account(run, timeline);
      expect(a.equity - 10_000_000).toBe(a.realizedPnl + a.openPnl);
      for (const v of Object.values(a)) expect(Number.isInteger(v)).toBe(true);
    }
  });
});

describe('apply: refusals', () => {
  const refused = (run: RunState, command: Command) => {
    const { state, events } = apply(run, timeline, command);
    expect(state).toEqual(run);
    expect(events).toHaveLength(1);
    return events[0];
  };

  it('refuses the index and unknown tickers', () => {
    const run = fresh();
    for (const ticker of ['TYX', 'NOPE'])
      expect(refused(run, { ...buy(ticker, 10), at: start })).toMatchObject({
        type: 'refused',
        reason: 'notTradable',
      });
  });

  it('refuses non-positive or fractional shares', () => {
    for (const shares of [0, -10, 2.5])
      expect(refused(fresh(), { ...buy('OMNX', shares), at: start })).toMatchObject({
        reason: 'invalidShares',
      });
  });

  it('refuses a command stamped with another bar than the cursor', () => {
    expect(refused(fresh(), { ...buy('OMNX', 10), at: start + 1 })).toMatchObject({
      reason: 'wrongBar',
    });
  });

  it('refuses selling past zero, and selling short when the run forbids it', () => {
    const long = act(fresh(), buy('OMNX', 100)).state;
    expect(refused(long, { ...sell('OMNX', 101), at: start })).toMatchObject({
      reason: 'crossesZero',
    });
    expect(refused(fresh(), { ...sell('OMNX', 10), at: start })).toMatchObject({
      reason: 'shortNotAllowed',
    });
  });
});

describe('apply: flatten', () => {
  it('closes the whole position with a market order', () => {
    const long = act(fresh(), buy('OMNX', 100)).state;
    const { state } = act(long, { type: 'flatten', ticker: 'OMNX' });
    expect(state.positions).toEqual({});
    expect(state.fills.at(-1)).toMatchObject({ side: 'sell', shares: 100 });
  });

  it('refuses when flat', () => {
    const run = fresh();
    expect(act(run, { type: 'flatten', ticker: 'OMNX' }).events).toEqual([
      {
        type: 'refused',
        command: { type: 'flatten', ticker: 'OMNX', at: start },
        reason: 'noPosition',
      },
    ]);
  });
});

describe('replay', () => {
  it('rebuilds the live state from the seed and a hand-written command log', () => {
    const log: Command[] = [
      { type: 'marketOrder', at: start, ticker: 'OMNX', side: 'buy', shares: 300 },
      { type: 'marketOrder', at: start + 4, ticker: 'KRVX', side: 'buy', shares: 120 },
      { type: 'marketOrder', at: start + 4, ticker: 'TYX', side: 'buy', shares: 10 },
      { type: 'marketOrder', at: start + 31, ticker: 'OMNX', side: 'sell', shares: 300 },
      { type: 'flatten', at: start + 64, ticker: 'KRVX' },
    ];
    let live = fresh();
    for (const command of log) {
      live = advanceTo(live, timeline, command.at).state;
      live = apply(live, timeline, command).state;
    }
    live = advanceTo(live, timeline, start + 90).state;

    const replayed = replay(generateMarketTimeline(48213), lv1, log, start + 90);
    expect(replayed).toEqual(live);
    expect(replayed.trades.map((t) => t.closedAt)).toEqual([start + 31, start + 64]);
  });
});
