import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from './marketTimeline';
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

  it('is deterministic per seed and differs across seeds', () => {
    expect(generateMarketTimeline(SEED)).toEqual(market);
    expect(generateMarketTimeline(SEED + 1).stocks[0]!.bars).not.toEqual(market.stocks[0]!.bars);
  });

  it('is plain serializable data', () => {
    expect(JSON.parse(JSON.stringify(market))).toEqual(market);
  });
});
