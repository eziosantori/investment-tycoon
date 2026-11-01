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

  it('refuses an order that would push exposure above equity, filling the largest one that fits', () => {
    const run = fresh();
    const { ask } = quote(run, 'OMNX');
    // Exposure after a buy of n is n × mid, equity 10M − n × (ask − mid): fits while n × ask ≤ 10M.
    const most = Math.floor(10_000_000 / ask);
    expect(act(run, buy('OMNX', most)).state.positions.OMNX).toMatchObject({ shares: most });
    expect(refused(run, { ...buy('OMNX', most + 1), at: start })).toMatchObject({
      type: 'refused',
      reason: 'insufficientBuyingPower',
    });
  });

  it('counts exposure across stocks', () => {
    const half = act(fresh(), buy('OMNX', Math.floor(5_000_000 / quote(fresh(), 'OMNX').ask)));
    const { ask } = quote(half.state, 'KRVX');
    expect(
      refused(half.state, { ...buy('KRVX', Math.ceil(5_000_000 / ask) + 10), at: start }),
    ).toMatchObject({ reason: 'insufficientBuyingPower' });
  });

  it('does not add short proceeds to buying power', () => {
    const lv7 = newRun(timeline, runSettingsFor(7));
    const short = act(lv7, sell('OMNX', 500)).state;
    expect(short.cash).toBeGreaterThan(10_000_000);
    const before = account(lv7, timeline).buyingPower;
    expect(account(short, timeline).buyingPower).toBeLessThan(before);
    const { ask } = quote(short, 'KRVX');
    expect(refused(short, { ...buy('KRVX', Math.floor(before / ask)), at: start })).toMatchObject({
      reason: 'insufficientBuyingPower',
    });
  });

  it('never refuses closing shares for buying power', () => {
    const run = fresh();
    const most = Math.floor(10_000_000 / quote(run, 'OMNX').ask);
    const full = act(run, buy('OMNX', most)).state;
    expect(account(full, timeline).buyingPower).toBeLessThan(quote(full, 'OMNX').ask);
    expect(act(full, sell('OMNX', 10)).state.positions.OMNX!.shares).toBe(most - 10);
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

describe('apply: shorts at Lv7', () => {
  const lv7 = runSettingsFor(7);
  const fresh7 = () => newRun(timeline, lv7);

  it('fills a short sale at the bid, adds the proceeds to cash and counts it as a liability', () => {
    const run = fresh7();
    const { bid, mid } = quote(run, 'OMNX');
    const { state, events } = act(run, sell('OMNX', 300));
    expect(state.cash).toBe(10_000_000 + 300 * bid);
    expect(state.positions.OMNX).toMatchObject({ shares: -300, costBasis: -300 * bid });
    expect(events[1]).toMatchObject({ type: 'tradeOpened', trade: { side: 'short' } });
    expect(account(state, timeline)).toMatchObject({
      equity: 10_000_000 - 300 * (mid - bid),
      openPnl: -300 * (mid - bid),
      exposure: 300 * mid,
    });
  });

  it('covers part of a short: integer basis, remainder kept, exact realized P&L', () => {
    let run = act(fresh7(), sell('KRVX', 7)).state;
    run = advanceTo(run, timeline, start + 3).state;
    run = act(run, sell('KRVX', 4)).state;
    const basis = run.positions.KRVX!.costBasis;
    run = advanceTo(run, timeline, start + 9).state;
    const { ask } = quote(run, 'KRVX');
    run = act(run, buy('KRVX', 3)).state;
    // Covering 3 of 11 short shares removes floor(basis × −3 / −11) of the (negative) basis.
    const removed = Math.floor((basis * -3) / -11);
    expect(Number.isInteger(removed)).toBe(true);
    expect(run.positions.KRVX).toMatchObject({ shares: -8, costBasis: basis - removed });
    expect(run.trades[0]!.realizedPnl).toBe(-3 * ask - removed);
    run = act(run, { type: 'flatten', ticker: 'KRVX' }).state;
    expect(run.positions).toEqual({});
    // Realized P&L is exactly the short proceeds minus the cover cost.
    const net = run.fills.reduce(
      (sum, f) => sum + (f.side === 'sell' ? 1 : -1) * f.shares * f.price,
      0,
    );
    expect(run.trades[0]!.realizedPnl).toBe(net);
    expect(run.cash - 10_000_000).toBe(net);
  });

  it('keeps equity − starting balance = realized + open P&L through shorts and partial closes', () => {
    let run = fresh7();
    const script: [number, CommandIntent][] = [
      [0, sell('OMNX', 310)],
      [3, buy('KRVX', 170)],
      [9, sell('OMNX', 91)],
      [17, buy('OMNX', 133)],
      [25, sell('KRVX', 51)],
      [33, { type: 'flatten', ticker: 'KRVX' }],
      [48, buy('OMNX', 101)],
      [60, { type: 'flatten', ticker: 'OMNX' }],
    ];
    for (const [offset, intent] of script) {
      for (let bar = run.cursor + 1; bar <= start + offset; bar++) {
        run = advanceTo(run, timeline, bar).state;
        const a = account(run, timeline);
        expect(a.equity - 10_000_000).toBe(a.realizedPnl + a.openPnl);
      }
      const step = act(run, intent);
      expect(step.events[0]!.type).toBe('fill');
      run = step.state;
      const a = account(run, timeline);
      expect(a.equity - 10_000_000).toBe(a.realizedPnl + a.openPnl);
      for (const v of Object.values(a)) expect(Number.isInteger(v)).toBe(true);
      for (const p of Object.values(run.positions))
        expect(Number.isInteger(p.costBasis)).toBe(true);
    }
    expect(run.positions).toEqual({});
    const a = account(run, timeline);
    expect(a.equity - 10_000_000).toBe(a.realizedPnl);
  });

  it('refuses covering past zero, leaving the state unchanged', () => {
    const short = act(fresh7(), sell('OMNX', 100)).state;
    const command: Command = { ...buy('OMNX', 101), at: start };
    const { state, events } = apply(short, timeline, command);
    expect(state).toEqual(short);
    expect(events).toEqual([{ type: 'refused', command, reason: 'crossesZero' }]);
  });

  it('refuses adding to a short when the run forbids it, leaving the state unchanged', () => {
    const short = act(fresh7(), sell('OMNX', 100)).state;
    const forbidden: RunState = { ...short, settings: lv1 };
    const command: Command = { ...sell('OMNX', 10), at: start };
    const { state, events } = apply(forbidden, timeline, command);
    expect(state).toEqual(forbidden);
    expect(events).toEqual([{ type: 'refused', command, reason: 'shortNotAllowed' }]);
  });

  it('flattens a short with a buy at the ask', () => {
    const short = act(fresh7(), sell('OMNX', 100)).state;
    const { ask } = quote(short, 'OMNX');
    const { state, events } = act(short, { type: 'flatten', ticker: 'OMNX' });
    expect(state.positions).toEqual({});
    expect(state.fills.at(-1)).toMatchObject({ side: 'buy', shares: 100, price: ask });
    expect(events.map((e) => e.type)).toEqual(['fill', 'tradeClosed']);
  });

  it('replays a log with shorts, covers and flattens to the live state', () => {
    const log: Command[] = [
      { type: 'marketOrder', at: start, ticker: 'OMNX', side: 'sell', shares: 300 },
      { type: 'marketOrder', at: start + 2, ticker: 'KRVX', side: 'buy', shares: 120 },
      { type: 'marketOrder', at: start + 9, ticker: 'OMNX', side: 'buy', shares: 110 },
      { type: 'marketOrder', at: start + 9, ticker: 'OMNX', side: 'buy', shares: 999 },
      { type: 'flatten', at: start + 20, ticker: 'OMNX' },
      { type: 'marketOrder', at: start + 21, ticker: 'OMNX', side: 'sell', shares: 50 },
      { type: 'flatten', at: start + 40, ticker: 'KRVX' },
    ];
    let live = fresh7();
    for (const command of log) {
      live = advanceTo(live, timeline, command.at).state;
      live = apply(live, timeline, command).state;
    }
    live = advanceTo(live, timeline, start + 60).state;

    const replayed = replay(generateMarketTimeline(48213), lv7, log, start + 60);
    expect(replayed).toEqual(live);
    expect(replayed.trades.map((t) => [t.side, t.closedAt])).toEqual([
      ['short', start + 20],
      ['long', start + 40],
      ['short', null],
    ]);
  });
});

describe('the end of the market', () => {
  const end = endCursor(timeline);
  const flatten = (ticker: string) => ({ type: 'flatten', ticker }) as const;

  it('clamps at the last bar, then refuses every order with marketEnded, state unchanged', () => {
    const held = act(fresh(), buy('OMNX', 100)).state;
    const ended = advanceTo(held, timeline, 10 ** 9).state;
    expect(ended.cursor).toBe(end);
    for (const intent of [buy('OMNX', 10), sell('OMNX', 10), buy('KRVX', 10), flatten('OMNX')]) {
      const { state, events } = act(ended, intent);
      expect(state).toBe(ended);
      expect(events).toEqual([
        { type: 'refused', command: { ...intent, at: end }, reason: 'marketEnded' },
      ]);
    }
  });

  it('keeps open positions, valued at the final mid', () => {
    const held = act(fresh(), buy('OMNX', 100)).state;
    const ended = advanceTo(held, timeline, end).state;
    const { mid } = quote(ended, 'OMNX');
    const position = ended.positions.OMNX!;
    expect(position.shares).toBe(100);
    const acc = account(ended, timeline);
    expect(acc.openPnl).toBe(100 * mid - position.costBasis);
    expect(acc.equity).toBe(ended.cash + 100 * mid);
    expect(account(advanceTo(ended, timeline, end + 50).state, timeline)).toEqual(acc);
  });
});
