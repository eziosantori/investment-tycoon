import { describe, expect, it } from 'vitest';
import { createRng } from '../rng';
import { DAYS_PER_WEEK, generateMarket } from './generate';
import { MARKET_PARAMS } from './params';
import { buildStageTimeline } from './stageCycle';
import { buildWeeklyChart, VISIBLE_WEEKS } from './weeklyChart';

describe('generateMarket', () => {
  it('is deterministic for a seed', () => {
    expect(generateMarket({ seed: 48213, weeks: 80 })).toEqual(
      generateMarket({ seed: 48213, weeks: 80 }),
    );
  });

  it('differs across seeds', () => {
    const a = generateMarket({ seed: 1, weeks: 40 });
    const b = generateMarket({ seed: 2, weeks: 40 });
    expect(a.stock.map((x) => x.c)).not.toEqual(b.stock.map((x) => x.c));
  });

  it('produces valid, tick-rounded bars', () => {
    for (const seed of [1, 7, 48213, 99999]) {
      const { index, stock } = generateMarket({ seed, weeks: 170 });
      expect(stock).toHaveLength(170 * DAYS_PER_WEEK);
      expect(index).toHaveLength(170 * DAYS_PER_WEEK);
      for (const b of stock) {
        expect(b.l).toBeGreaterThan(0);
        expect(b.h).toBeGreaterThanOrEqual(Math.max(b.o, b.c));
        expect(b.l).toBeLessThanOrEqual(Math.min(b.o, b.c));
        expect(b.v).toBeGreaterThan(0);
        expect(Math.abs(b.c * 100 - Math.round(b.c * 100))).toBeLessThan(1e-6);
      }
    }
  });

  it('drifts up in Stage 2 and down in Stage 4 on average', () => {
    const avgReturn: Record<number, number[]> = { 2: [], 4: [] };
    for (let seed = 1; seed <= 40; seed++) {
      const { stock } = generateMarket({ seed, weeks: 170 });
      for (let i = 1; i < stock.length; i++) {
        const cur = stock[i];
        const prev = stock[i - 1];
        if (!cur || !prev) continue;
        if (cur.stage === 2 || cur.stage === 4) avgReturn[cur.stage]?.push(cur.c / prev.c - 1);
      }
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(avgReturn[2] ?? [])).toBeGreaterThan(0);
    expect(mean(avgReturn[4] ?? [])).toBeLessThan(0);
  });
});

describe('buildStageTimeline', () => {
  it('only makes allowed stage transitions', () => {
    const allowed = new Set(['1>2', '1>4', '2>1', '2>3', '3>2', '3>4', '4>1']);
    const stages = buildStageTimeline(2000, MARKET_PARAMS.stock.stageCycle, createRng(5));
    for (let i = 1; i < stages.length; i++) {
      if (stages[i] !== stages[i - 1]) {
        expect(allowed.has(`${stages[i - 1]}>${stages[i]}`)).toBe(true);
      }
    }
  });
});

describe('buildWeeklyChart', () => {
  it('has studies populated across the whole visible window', () => {
    const { stock } = buildWeeklyChart(48213);
    expect(stock).toHaveLength(VISIBLE_WEEKS);
    for (const b of stock) {
      expect(b.ma10).not.toBeNull();
      expect(b.ma30).not.toBeNull();
      expect(b.avgVol10).not.toBeNull();
      expect(b.rs).not.toBeNull();
    }
  });
});
