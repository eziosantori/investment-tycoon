import { describe, expect, it } from 'vitest';
import { endCursor, startCursor } from '../cursor';
import { generateMarketTimeline } from '../market/marketTimeline';
import { tradeQuote } from './quote';

const timeline = generateMarketTimeline(48213);
const omnx = timeline.stocks.find((s) => s.info.ticker === 'OMNX')!;

describe('tradeQuote', () => {
  it('quotes around the close of the bar at the cursor', () => {
    const cursor = startCursor(timeline);
    const q = tradeQuote(timeline, 'OMNX', cursor)!;
    expect(q.mid).toBe(omnx.bars[cursor]!.c);
    expect(q.ticker).toBe('OMNX');
  });

  it('rounds the half spread against the player: ask up, bid down', () => {
    // A worked example: mid $65.00 at 6 bps → half spread 1.95 cents → ask +2, bid −2.
    const fake = {
      ...timeline,
      stocks: timeline.stocks.map((s) =>
        s.info.ticker === 'OMNX' ? { ...s, bars: s.bars.map((b) => ({ ...b, c: 6500 })) } : s,
      ),
    };
    const q = tradeQuote(fake, 'OMNX', 0)!;
    expect(q.spreadBps).toBe(6);
    expect(q).toMatchObject({ mid: 6500, ask: 6502, bid: 6498 });
  });

  it('keeps at least one cent between the mid and each side, all integers', () => {
    for (const cursor of [0, startCursor(timeline), endCursor(timeline)]) {
      for (const s of timeline.stocks) {
        const q = tradeQuote(timeline, s.info.ticker, cursor)!;
        expect(q.ask).toBeGreaterThanOrEqual(q.mid + 1);
        expect(q.bid).toBeLessThanOrEqual(q.mid - 1);
        for (const v of [q.mid, q.ask, q.bid]) expect(Number.isInteger(v)).toBe(true);
      }
    }
  });

  it('gives every stock a spread of 5–15 bps, wider for small, volatile names', () => {
    const bps = (t: string) => tradeQuote(timeline, t, 0)!.spreadBps;
    for (const s of timeline.stocks) {
      expect(bps(s.info.ticker)).toBeGreaterThanOrEqual(5);
      expect(bps(s.info.ticker)).toBeLessThanOrEqual(15);
    }
    expect(bps('CYGN')).toBeGreaterThan(bps('MERI'));
  });

  it('has no quote for the index or an unknown ticker', () => {
    expect(tradeQuote(timeline, 'TYX', 0)).toBeNull();
    expect(tradeQuote(timeline, 'NOPE', 0)).toBeNull();
  });
});
