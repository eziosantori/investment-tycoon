import { describe, expect, it } from 'vitest';
import { INDEX, STOCKS } from '../universe';
import { RUN_WEEKS, WARMUP_WEEKS } from './calendar';
import { generateHiddenStages } from './hiddenStages';
import { MARKET_PARAMS } from './params';
import type { Stage } from './types';

const UNIVERSE = { index: INDEX, stocks: STOCKS };
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const W0 = WARMUP_WEEKS;
const markets = SEEDS.map((seed) => generateHiddenStages(seed, UNIVERSE));

/** Late Stage 1 (leaves the base within 6 weeks) or early Stage 2 (entered within 4 weeks). */
function isSettingUp(stages: readonly Stage[]): boolean {
  const s = stages[W0];
  if (s === 1) return stages.slice(W0 + 1, W0 + 7).some((x) => x !== 1);
  if (s === 2) return stages.slice(W0 - 4, W0).some((x) => x !== 2);
  return false;
}

describe('generateHiddenStages: the deal', () => {
  it('deals at least 3 stocks setting up, some in Stage 3/4 and an index not in Stage 4, on every seed', () => {
    for (const m of markets) {
      const settingUp = m.stocks.filter(isSettingUp).length;
      const traps = m.stocks.filter((s) => s[W0] === 3 || s[W0] === 4).length;
      expect(settingUp).toBeGreaterThanOrEqual(3);
      expect(traps).toBeGreaterThanOrEqual(1);
      expect(m.index[W0]).not.toBe(4);
    }
  });
});

/** Consecutive runs of the same stage: [stage, length]. */
function runsOf(stages: readonly Stage[]): [Stage, number][] {
  const runs: [Stage, number][] = [];
  for (const s of stages) {
    const last = runs[runs.length - 1];
    if (last && last[0] === s) last[1] += 1;
    else runs.push([s, 1]);
  }
  return runs;
}

describe('generateHiddenStages: the stage cycle', () => {
  it('covers the 160 warm-up weeks and the 10 run weeks of every instrument', () => {
    for (const m of markets) {
      expect(m.index).toHaveLength(170);
      expect(m.stocks).toHaveLength(12);
      for (const s of m.stocks) expect(s).toHaveLength(WARMUP_WEEKS + RUN_WEEKS);
    }
  });

  it('keeps every whole stage within its duration range (a failed breakout within 2–6 weeks)', () => {
    const check = (stages: readonly Stage[], kind: 'index' | 'stock') => {
      const p = MARKET_PARAMS[kind].stageCycle;
      const runs = runsOf(stages);
      // The first and last runs are cut by the edges of the timeline.
      for (let i = 1; i < runs.length - 1; i++) {
        const [stage, length] = runs[i]!;
        const failed = stage === 2 && runs[i + 1]![0] === 1;
        const [lo, hi] = failed ? [2, 6] : p.durations[stage];
        expect(length).toBeGreaterThanOrEqual(lo);
        expect(length).toBeLessThanOrEqual(hi);
      }
    };
    for (const m of markets) {
      check(m.index, 'index');
      for (const s of m.stocks) check(s, 'stock');
    }
  });

  it('only makes cycle transitions, and every failure branch occurs', () => {
    const seen = new Set<string>();
    for (const m of markets) {
      for (const stages of [m.index, ...m.stocks]) {
        const runs = runsOf(stages);
        for (let i = 1; i < runs.length; i++) seen.add(`${runs[i - 1]![0]}>${runs[i]![0]}`);
      }
    }
    expect([...seen].sort()).toEqual(['1>2', '1>4', '2>1', '2>3', '3>2', '3>4', '4>1']);
  });

  it('gives the same stages for the same seed and different ones for another seed', () => {
    expect(generateHiddenStages(48213, UNIVERSE)).toEqual(generateHiddenStages(48213, UNIVERSE));
    expect(generateHiddenStages(48213, UNIVERSE)).not.toEqual(
      generateHiddenStages(48214, UNIVERSE),
    );
  });

  it("leaves the other stocks' stages unchanged when one stock's parameters change", () => {
    const tuned = STOCKS.map((s, i) =>
      i === 4
        ? {
            ...s,
            volScale: 2,
            stageCycle: { ...MARKET_PARAMS.stock.stageCycle, pFailedBreakout: 0.6 },
          }
        : s,
    );
    let changed = 0;
    for (const seed of SEEDS.slice(0, 20)) {
      const before = generateHiddenStages(seed, UNIVERSE);
      const after = generateHiddenStages(seed, { index: INDEX, stocks: tuned });
      expect(after.index).toEqual(before.index);
      for (let i = 0; i < STOCKS.length; i++) {
        if (i !== 4) expect(after.stocks[i]).toEqual(before.stocks[i]);
      }
      if (JSON.stringify(after.stocks[4]) !== JSON.stringify(before.stocks[4])) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });
});
