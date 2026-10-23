import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from './marketTimeline';
import { INDEX, STOCKS } from '../../content/universe';
import { generateHiddenStages } from './hiddenStages';
import type { Bar } from './types';

const SEED = 48213;
const market = generateMarketTimeline(SEED);
const all = [market.index, ...market.stocks];

/** Independent aggregate: open of the first, extremes, close of the last, summed volume. */
function aggregateBy(bars: readonly Bar[], size: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i < bars.length; i += size) {
    const g = bars.slice(i, i + size);
    out.push({
      o: g[0]!.o,
      h: Math.max(...g.map((b) => b.h)),
      l: Math.min(...g.map((b) => b.l)),
      c: g[g.length - 1]!.c,
      v: g.reduce((s, b) => s + b.v, 0),
    });
  }
  return out;
}

describe('generateMarketTimeline', () => {
  it('has 160 warm-up weeks and 10 run weeks', () => {
    expect(market.warmupWeeks).toBe(160);
    expect(market.runWeeks).toBe(10);
    expect(market.seed).toBe(SEED);
  });

  it('has the TYX index and 12 stocks with distinct tickers', () => {
    expect(market.index.info).toMatchObject({ ticker: 'TYX', kind: 'index', beta: 1 });
    expect(market.stocks).toHaveLength(12);
    const tickers = new Set(all.map((i) => i.info.ticker));
    expect(tickers.size).toBe(13);
    for (const s of market.stocks) expect(s.info.kind).toBe('stock');
  });

  it('has 30 bars per week, 6 per session, for every week of every instrument', () => {
    for (const inst of all) {
      expect(inst.bars).toHaveLength(170 * 30);
      expect(inst.sessions).toHaveLength(170 * 5);
      expect(inst.weeks).toHaveLength(170);
      expect(inst.stages).toHaveLength(170);
      for (const study of Object.values(inst.studies)) expect(study).toHaveLength(170);
    }
  });

  it('aggregates sessions and weeks exactly from the 65m bars', () => {
    for (const inst of all) {
      expect(inst.sessions).toEqual(aggregateBy(inst.bars, 6));
      expect(inst.weeks).toEqual(aggregateBy(inst.bars, 30));
    }
  });

  it('uses positive integer cents and integer shares, with consistent OHLC', () => {
    const bad = all.flatMap((inst) =>
      inst.bars.filter(
        (b) =>
          ![b.o, b.h, b.l, b.c].every((p) => Number.isInteger(p) && p > 0) ||
          !Number.isInteger(b.v) ||
          b.v < 0 ||
          b.h < Math.max(b.o, b.c) ||
          b.l > Math.min(b.o, b.c),
      ),
    );
    expect(bad).toEqual([]);
  });

  it('computes the weekly studies on closed weeks, with no RS for the index', () => {
    const stock = market.stocks[0]!;
    const closes = stock.weeks.map((w) => w.c);
    const w = 100;
    const expectedMa10 = closes.slice(w - 9, w + 1).reduce((s, c) => s + c, 0) / 10;
    expect(stock.studies.ma10[w]).toBeCloseTo(expectedMa10, 9);
    expect(stock.studies.ma30[28]).toBeNull();
    expect(stock.studies.ma30[29]).not.toBeNull();
    expect(stock.studies.rs[market.warmupWeeks - 108]).not.toBeNull();
    expect(market.index.studies.rs.every((v) => v == null)).toBe(true);
  });

  it('deals setups and traps from the stages at the first run week', () => {
    const { deal } = market;
    const firstRun = market.warmupWeeks;
    const stageOf = (t: string) => market.stocks.find((s) => s.info.ticker === t)!.stages[firstRun];
    for (const t of deal.settingUp) expect([1, 2]).toContain(stageOf(t));
    for (const t of deal.traps) expect([3, 4]).toContain(stageOf(t));
    expect(deal.indexStage).toBe(market.index.stages[firstRun]);
    expect(market.stocks.map((s) => s.info.ticker)).toContain(deal.defaultInstrument);
    if (deal.settingUp.length > 0) expect(deal.defaultInstrument).toBe(deal.settingUp[0]);
  });

  it('records the dealt hidden stages and a balanced deal', () => {
    const dealt = generateHiddenStages(SEED, { index: INDEX, stocks: STOCKS });
    expect(market.index.stages).toEqual(dealt.index);
    expect(market.stocks.map((s) => s.stages)).toEqual(dealt.stocks);
    expect(market.deal.settingUp.length).toBeGreaterThanOrEqual(3);
    expect(market.deal.traps.length).toBeGreaterThanOrEqual(1);
    expect(market.deal.indexStage).not.toBe(4);
  });

  it('is deterministic per seed and differs across seeds', () => {
    expect(generateMarketTimeline(SEED)).toEqual(market);
    expect(generateMarketTimeline(SEED + 1).stocks[0]!.bars).not.toEqual(market.stocks[0]!.bars);
  });

  it('is plain serializable data', () => {
    expect(JSON.parse(JSON.stringify(market))).toEqual(market);
  });
});

/** FNV-1a over the timeline's JSON: any change to generation changes it. */
function hashOf(value: unknown): string {
  const s = JSON.stringify(value);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

describe('generateMarketTimeline: the real price series', () => {
  it('is stamped with ENGINE_VERSION 2', () => {
    expect(market.engineVersion).toBe(2);
  });

  // Pinned: any change to generation (params, model, RNG use) changes it. When the
  // change is intended, bump ENGINE_VERSION if it isn't bumped yet and re-pin.
  it('matches the pinned golden hash for its seed', () => {
    expect(hashOf(market)).toBe('8a1fbbe8');
  });

  it('leaves the other instruments identical when one stock content changes', () => {
    const edited = STOCKS.map((s, i) =>
      i === 3 ? { ...s, beta: 1.5, startPrice: s.startPrice * 2, volScale: 1.4 } : s,
    );
    const other = generateMarketTimeline(SEED, { index: INDEX, stocks: edited });
    expect(other.stocks[3]!.bars).not.toEqual(market.stocks[3]!.bars);
    expect(other.index).toEqual(market.index);
    for (let i = 0; i < STOCKS.length; i++) {
      if (i !== 3) expect(other.stocks[i]).toEqual(market.stocks[i]);
    }
  });

  it('stays positive on every seed, even the volatile ones', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const m = generateMarketTimeline(seed);
      for (const inst of [m.index, ...m.stocks]) {
        for (const b of inst.bars) {
          if (!(b.l > 0 && Number.isInteger(b.l) && Number.isInteger(b.v))) {
            throw new Error(`seed ${seed} ${inst.info.ticker}: bad bar ${JSON.stringify(b)}`);
          }
        }
      }
    }
  });

  it('drifts up in Stage 2 and down in Stage 4, net of the index', () => {
    const byStage: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (let seed = 1; seed <= 20; seed++) {
      const m = generateMarketTimeline(seed);
      for (const s of m.stocks) {
        for (let w = 1; w < s.weeks.length; w++) {
          const r = Math.log(s.weeks[w]!.c / s.weeks[w - 1]!.c);
          const ri = Math.log(m.index.weeks[w]!.c / m.index.weeks[w - 1]!.c);
          byStage[s.stages[w]!]!.push(r - s.info.beta * ri);
        }
      }
    }
    const mean = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
    expect(mean(byStage[2]!)).toBeGreaterThan(0.004);
    expect(mean(byStage[4]!)).toBeLessThan(-0.004);
    expect(Math.abs(mean(byStage[1]!))).toBeLessThan(0.003);
  });

  it('gives the index about half the volatility of the stocks, with fat tails', () => {
    const sd = (xs: number[]) => {
      const m = xs.reduce((a, x) => a + x, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length);
    };
    const kurtosis = (xs: number[]) => {
      const m = xs.reduce((a, x) => a + x, 0) / xs.length;
      const v = xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length;
      return xs.reduce((a, x) => a + (x - m) ** 4, 0) / xs.length / v ** 2;
    };
    const sessionReturns = (bars: readonly Bar[]) =>
      bars.slice(1).map((b, i) => Math.log(b.c / bars[i]!.c));
    const indexVol = sd(sessionReturns(market.index.sessions));
    const stockVol =
      market.stocks.reduce((a, s) => a + sd(sessionReturns(s.sessions)), 0) / market.stocks.length;
    expect(indexVol / stockVol).toBeGreaterThan(0.3);
    expect(indexVol / stockVol).toBeLessThan(0.7);
    expect(kurtosis(sessionReturns(market.stocks[0]!.bars))).toBeGreaterThan(3);
  });

  it('generates the whole market in well under 150 ms', () => {
    generateMarketTimeline(SEED + 7); // warm the JIT
    const t0 = performance.now();
    generateMarketTimeline(SEED + 8);
    expect(performance.now() - t0).toBeLessThan(150);
  });
});
