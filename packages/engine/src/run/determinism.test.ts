// Property: over random seeds and random command logs using every M2 command,
// the seed plus the command log rebuild the live run exactly (ADR-0005).
// The live run is played the way the app plays it: playback ticks of random
// size, commands dispatched at the cursor and appended to the log whether they
// fill or not. Replay starts from a freshly generated timeline and jumps from
// command to command. Cases come from the engine's own seeded RNG, so a failure
// names the case seed that reproduces it.
import { describe, expect, it } from 'vitest';
import { endCursor, startCursor } from '../cursor';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { MarketTimeline } from '../market/types';
import { createRng, type Rng } from '../rng';
import { account, advanceTo, apply, newRun, replay } from './reducer';
import type { Command, RefusalReason, RunSettings, RunState } from './types';

const MARKET_SEEDS = 12;
const LOGS_PER_SEED = 4;
const COMMANDS_PER_LOG = 60;

const pick = <T>(rng: Rng, items: readonly T[]): T => items[rng.int(0, items.length - 1)]!;

/** A random share count: mostly sensible, sometimes the position, sometimes malformed. */
function randomShares(rng: Rng, run: RunState, ticker: string): number {
  const held = Math.abs(run.positions[ticker]?.shares ?? 0);
  const r = rng.next();
  if (r < 0.55) return rng.int(1, 60) * 10;
  if (r < 0.7 && held > 0) return held;
  if (r < 0.8 && held > 1) return rng.int(1, held - 1);
  if (r < 0.88) return rng.int(1, 9) * 1000;
  return pick(rng, [0, -10, 2.5, Number.NaN]);
}

function randomCommand(rng: Rng, timeline: MarketTimeline, run: RunState, lastAt: number): Command {
  const stocks = timeline.stocks.map((s) => s.info.ticker);
  const tickers = [...stocks, timeline.index.info.ticker, 'NOPE'];
  const held = Object.keys(run.positions);
  const ticker = held.length > 0 && rng.chance(0.5) ? pick(rng, held) : pick(rng, tickers);
  // Now and then a command stamped before the last logged one (refused:
  // wrongBar, live and on replay alike).
  const at = rng.chance(0.03) ? lastAt - 1 : run.cursor;
  if (rng.chance(0.2)) return { type: 'flatten', at, ticker };
  return {
    type: 'marketOrder',
    at,
    ticker,
    side: rng.chance(0.5) ? 'buy' : 'sell',
    shares: randomShares(rng, run, ticker),
  };
}

interface Played {
  live: RunState;
  log: Command[];
  refusals: Set<RefusalReason>;
  closedTrades: number;
}

/** Plays a run like the app: random playback ticks, commands at the cursor. */
function playLive(timeline: MarketTimeline, settings: RunSettings, rng: Rng): Played {
  const end = endCursor(timeline);
  let live = newRun(timeline, settings);
  const log: Command[] = [];
  const refusals = new Set<RefusalReason>();
  for (let i = 0; i < COMMANDS_PER_LOG; i++) {
    // Ticks of 0 (several commands on one bar) to a few sessions; some past the end.
    const ticks = rng.int(0, 3);
    for (let t = 0; t < ticks; t++) {
      live = advanceTo(live, timeline, live.cursor + rng.int(1, 8)).state;
    }
    if (rng.chance(0.02)) live = advanceTo(live, timeline, end + 10).state;
    const command = randomCommand(rng, timeline, live, log.at(-1)?.at ?? startCursor(timeline));
    const step = apply(live, timeline, command);
    for (const e of step.events) if (e.type === 'refused') refusals.add(e.reason);
    // Every command reaches the log, refused or not, stale ones included.
    log.push(command);
    live = step.state;

    const a = account(live, timeline);
    expect(a.equity - settings.startingBalance).toBe(a.realizedPnl + a.openPnl);
  }
  live = advanceTo(live, timeline, live.cursor + rng.int(0, 30)).state;
  return { live, log, refusals, closedTrades: live.trades.filter((t) => t.closedAt).length };
}

describe('determinism: replay(seed, log) == live', () => {
  it('holds over random seeds and random command logs', () => {
    const cases = createRng(1930);
    const refusals = new Set<RefusalReason>();
    let fills = 0;
    let closedTrades = 0;

    for (let s = 0; s < MARKET_SEEDS; s++) {
      const seed = cases.int(1, 2 ** 31 - 1);
      const timeline = generateMarketTimeline(seed);
      for (let l = 0; l < LOGS_PER_SEED; l++) {
        const caseSeed = cases.int(1, 2 ** 31 - 1);
        const settings: RunSettings = {
          startingBalance: 10_000_000,
          allowShort: l % 2 === 1,
        };
        const played = playLive(timeline, settings, createRng(caseSeed));

        const replayed = replay(
          generateMarketTimeline(seed),
          settings,
          played.log,
          played.live.cursor,
        );
        expect(replayed, `market seed ${seed}, case seed ${caseSeed}`).toEqual(played.live);
        // And the save round-trips through JSON (ADR-0005: a plain object).
        expect(JSON.parse(JSON.stringify(replayed))).toEqual(played.live);

        for (const r of played.refusals) refusals.add(r);
        fills += played.live.fills.length;
        closedTrades += played.closedTrades;
        expect(played.live.cursor).toBeGreaterThanOrEqual(startCursor(timeline));
      }
    }

    // The logs really exercise every M2 command and refusal.
    expect(fills).toBeGreaterThan(200);
    expect(closedTrades).toBeGreaterThan(20);
    expect([...refusals].sort()).toEqual(
      [
        'crossesZero',
        'insufficientBuyingPower',
        'invalidShares',
        'marketEnded',
        'noPosition',
        'notTradable',
        'shortNotAllowed',
        'wrongBar',
      ].sort(),
    );
  });
});
