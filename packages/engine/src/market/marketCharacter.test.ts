import { describe, expect, it } from 'vitest';
import { STOCKS } from '../universe';
import { generateMarketTimeline } from './marketTimeline';
import { measureStageEvents, type Breakdown, type Breakout } from './stageEvents';
import type { Stage } from './types';

/**
 * The statistical suite (M1 spec, Testing Decisions, Seam 1): over 200 seeds,
 * the market has the character Stage Analysis describes. Ranges, not exact
 * values: tuning `MARKET_PARAMS` may move the numbers inside them.
 *
 * One pass over the seeds collects everything (a market is ~66k bars, so they
 * are not kept), then each test reads its numbers.
 */

const SEEDS = 200;

const breakouts: Breakout[] = [];
const breakdowns: Breakdown[] = [];
let seedsWithVolumeBreakout = 0;
/** Weekly log return net of beta × index, ÷ volScale, per stage. */
const netReturns: Record<Stage, number[]> = { 1: [], 2: [], 3: [], 4: [] };
/** Weekly volume ÷ (30 × base volume), per stage. */
const volumeLevels: Record<Stage, number[]> = { 1: [], 2: [], 3: [], 4: [] };
/** Per stage: sums of squared 65m open-to-close returns net of beta × index, ÷ volScale. */
const barVariance: Record<Stage, { n: number; sum: number }> = {
  1: { n: 0, sum: 0 },
  2: { n: 0, sum: 0 },
  3: { n: 0, sum: 0 },
  4: { n: 0, sum: 0 },
};
/** |30w MA slope| (% over 4 weeks): mid Stage 2, first and last week of a top. */
const slopeMidAdvance: number[] = [];
const slopeStartOfTop: number[] = [];
const slopeEndOfTop: number[] = [];
/** Per stock: sums for the regression of weekly returns on the index's. */
const regression = STOCKS.map(() => ({ n: 0, x: 0, y: 0, xx: 0, xy: 0 }));
const barKurtosis: number[] = [];
const totalNetReturn: number[] = [];
let lowestPrice = Infinity;

const kurtosisOf = (xs: readonly number[]) => {
  const m = xs.reduce((a, x) => a + x, 0) / xs.length;
  const v = xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length;
  return xs.reduce((a, x) => a + (x - m) ** 4, 0) / xs.length / v ** 2;
};

for (let seed = 1; seed <= SEEDS; seed++) {
  const m = generateMarketTimeline(seed);
  const iw = m.index.weeks;
  let volumeBreakout = false;
  for (const inst of [m.index, ...m.stocks]) {
    for (const b of inst.bars) lowestPrice = Math.min(lowestPrice, b.l);
  }
  m.stocks.forEach((s, i) => {
    const events = measureStageEvents(s.weeks, s.stages);
    breakouts.push(...events.breakouts);
    breakdowns.push(...events.breakdowns);
    if (events.breakouts.some((b) => b.volumeRatio >= 2)) volumeBreakout = true;

    const base = 30 * STOCKS[i]!.baseVolume;
    s.bars.forEach((b, k) => {
      const ib = m.index.bars[k]!;
      const r = Math.log(b.c / b.o) - s.info.beta * Math.log(ib.c / ib.o);
      const v = barVariance[s.stages[Math.floor(k / 30)]!];
      v.n++;
      v.sum += (r / STOCKS[i]!.volScale) ** 2;
    });
    const reg = regression[i]!;
    let net = 0;
    for (let w = 1; w < s.weeks.length; w++) {
      const stage = s.stages[w]!;
      const r = Math.log(s.weeks[w]!.c / s.weeks[w - 1]!.c);
      const ri = Math.log(iw[w]!.c / iw[w - 1]!.c);
      netReturns[stage].push((r - s.info.beta * ri) / STOCKS[i]!.volScale);
      net += r - s.info.beta * ri;
      volumeLevels[stage].push(s.weeks[w]!.v / base);
      reg.n++;
      reg.x += ri;
      reg.y += r;
      reg.xx += ri * ri;
      reg.xy += ri * r;
      const slope = s.studies.ma30Slope[w];
      if (slope == null) continue;
      if (stage === 2 && s.stages[w - 8] === 2 && s.stages[w + 8] === 2) {
        slopeMidAdvance.push(Math.abs(slope));
      }
      if (stage === 3 && s.stages[w - 1] !== 3) slopeStartOfTop.push(Math.abs(slope));
      if (stage === 3 && w + 1 < s.weeks.length && s.stages[w + 1] !== 3) {
        slopeEndOfTop.push(Math.abs(slope));
      }
    }
    totalNetReturn.push(net);
    if (seed <= 20 && i < 3) {
      const rs = s.bars.slice(1).map((b, k) => Math.log(b.c / s.bars[k]!.c));
      barKurtosis.push(kurtosisOf(rs));
    }
  });
  if (volumeBreakout) seedsWithVolumeBreakout++;
}

const mean = (xs: readonly number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const barVol = (stage: Stage) => Math.sqrt(barVariance[stage].sum / barVariance[stage].n);
const share = <T>(xs: readonly T[], test: (x: T) => boolean) => xs.filter(test).length / xs.length;

describe('the market over 200 seeds', () => {
  it('never prices anything at or below zero', () => {
    expect(lowestPrice).toBeGreaterThan(0);
  });

  it('drifts the way each stage says: flat in 1 and 3, up in 2, down in 4', () => {
    expect(mean(netReturns[2])).toBeGreaterThan(0.004);
    expect(mean(netReturns[4])).toBeLessThan(-0.004);
    expect(Math.abs(mean(netReturns[1]))).toBeLessThan(0.003);
    expect(Math.abs(mean(netReturns[3]))).toBeLessThan(0.004);
  });

  it('keeps stocks roughly balanced over the whole timeline, net of the index', () => {
    // Over 170 weeks a stock neither always soars nor always sinks on its own.
    const med = median(totalNetReturn);
    expect(med).toBeGreaterThan(-0.5);
    expect(med).toBeLessThan(0.7);
  });

  it('moves stocks with the index by their beta', () => {
    regression.forEach((r, i) => {
      const slope = (r.xy - (r.x * r.y) / r.n) / (r.xx - (r.x * r.x) / r.n);
      expect(Math.abs(slope - STOCKS[i]!.beta)).toBeLessThan(0.2);
    });
  });

  it('has fat tails: 65m returns with kurtosis above 3', () => {
    expect(median(barKurtosis)).toBeGreaterThan(3);
  });

  it('breaks out on ≥ 2× volume in about 80% of seeds or more', () => {
    expect(seedsWithVolumeBreakout / SEEDS).toBeGreaterThanOrEqual(0.8);
  });
});

describe('stage signatures over 200 seeds', () => {
  it('builds bases on low volatility and volume (≈0.7×)', () => {
    const baseVol = barVol(1) / barVol(2);
    expect(baseVol).toBeGreaterThan(0.5);
    expect(baseVol).toBeLessThan(0.85);
    expect(median(volumeLevels[1]) / median(volumeLevels[2])).toBeGreaterThan(0.5);
    expect(median(volumeLevels[1]) / median(volumeLevels[2])).toBeLessThan(0.85);
  });

  it('breaks out with a close above resistance on 2–3× volume', () => {
    expect(breakouts.length).toBeGreaterThan(SEEDS);
    expect(share(breakouts, (b) => b.overResistance > 0)).toBeGreaterThan(0.95);
    expect(median(breakouts.map((b) => b.volumeRatio))).toBeGreaterThan(2);
    expect(median(breakouts.map((b) => b.volumeRatio))).toBeLessThan(3);
    expect(share(breakouts, (b) => b.volumeRatio >= 1.8 && b.volumeRatio <= 3.3)).toBeGreaterThan(
      0.85,
    );
  });

  it('keeps volume at 1.3–1.8× for the 2 weeks after a breakout that holds', () => {
    const follow = breakouts.filter((b) => !b.failed).flatMap((b) => b.followRatios);
    expect(median(follow)).toBeGreaterThan(1.3);
    expect(median(follow)).toBeLessThan(1.8);
    expect(share(follow, (r) => r >= 1.1 && r <= 2)).toBeGreaterThan(0.8);
  });

  it('opens about half of the breakouts with a +2–4% gap', () => {
    const gapped = breakouts.filter((b) => b.gap >= 0.015);
    expect(gapped.length / breakouts.length).toBeGreaterThan(0.35);
    expect(gapped.length / breakouts.length).toBeLessThan(0.65);
    expect(median(gapped.map((b) => b.gap))).toBeGreaterThan(0.02);
    expect(median(gapped.map((b) => b.gap))).toBeLessThan(0.04);
  });

  it('brings failed breakouts back into the base within 2–6 weeks on normal volume', () => {
    const failed = breakouts.filter((b) => b.failed);
    expect(failed.length).toBeGreaterThan(20);
    const back = failed.filter((b) => b.weeksBackInBase != null);
    expect(back.length / failed.length).toBeGreaterThan(0.9);
    expect(share(back, (b) => b.weeksBackInBase! >= 1 && b.weeksBackInBase! <= 6)).toBeGreaterThan(
      0.9,
    );
    const volume = median(back.map((b) => b.backInBaseVolumeRatio!));
    expect(volume).toBeGreaterThan(0.6);
    expect(volume).toBeLessThan(1.4);
  });

  it('tops on wider ranges (≈1.3×) and heavy volume, with a flattening 30w MA', () => {
    const topVol = barVol(3) / barVol(2);
    expect(topVol).toBeGreaterThan(1.1);
    expect(topVol).toBeLessThan(1.6);
    expect(median(volumeLevels[3]) / median(volumeLevels[2])).toBeGreaterThan(1.1);
    expect(Math.abs(mean(netReturns[3]))).toBeLessThan(0.004);
    expect(median(slopeEndOfTop)).toBeLessThan(median(slopeStartOfTop) * 0.7);
    expect(median(slopeEndOfTop)).toBeLessThan(median(slopeMidAdvance) * 0.75);
  });

  it('breaks down with a close below support on 1.5–2.5× volume, gapping down in ≈40%', () => {
    expect(breakdowns.length).toBeGreaterThan(SEEDS);
    for (const from of [1, 3] as const) expect(breakdowns.some((b) => b.from === from)).toBe(true);
    expect(share(breakdowns, (b) => b.underSupport < 0)).toBeGreaterThan(0.95);
    expect(median(breakdowns.map((b) => b.volumeRatio))).toBeGreaterThan(1.5);
    expect(median(breakdowns.map((b) => b.volumeRatio))).toBeLessThan(2.5);
    const gappedDown = share(breakdowns, (b) => b.gap <= -0.015);
    expect(gappedDown).toBeGreaterThan(0.25);
    expect(gappedDown).toBeLessThan(0.55);
  });
});
