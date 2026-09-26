import { describe, expect, it } from 'vitest';
import { buildWeeklyChart } from '../engine/market/weeklyChart';
import { buildDemoScenario } from './demoScenario';

describe('buildDemoScenario', () => {
  it('always shows a consistent open position', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const { stock } = buildWeeklyChart(seed);
      const { position: p, equity } = buildDemoScenario(stock);
      expect(p.stop).toBeLessThan(p.entry);
      expect(p.target).toBeCloseTo(p.entry + 2 * (p.entry - p.stop), 1);
      expect(p.size).toBe(Math.floor(p.riskBudget / (p.entry - p.stop)));
      // Still open: price hasn't gone through the stop or the target.
      expect(p.openR).toBeGreaterThan(-1);
      expect(p.openR).toBeLessThan(2);
      expect(equity).toBeCloseTo(102_410 + p.openPnl, 6);
    }
  });
});
