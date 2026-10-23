import { describe, expect, it } from 'vitest';
import type { LegacyBar } from './market/types';
import { aggregate, mansfieldRs, slopePct, sma } from './studies';

const bar = (t: number, o: number, h: number, l: number, c: number, v = 100): LegacyBar => ({
  t,
  o,
  h,
  l,
  c,
  v,
  stage: 1,
});

describe('sma', () => {
  it('is null until the window is full, then averages', () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });
});

describe('mansfieldRs', () => {
  it('is zero when the stock moves exactly with the index', () => {
    const index = Array.from({ length: 60 }, (_, i) => 100 + i);
    const stock = index.map((x) => x * 0.4);
    const rs = mansfieldRs(stock, index, 52);
    expect(rs[50]).toBeNull();
    expect(rs[59]).toBeCloseTo(0, 10);
  });

  it('is positive when the stock outperforms', () => {
    const index = Array.from({ length: 60 }, () => 100);
    const stock = Array.from({ length: 60 }, (_, i) => 10 + i * 0.5);
    const rs = mansfieldRs(stock, index, 52);
    expect(rs[59]).toBeGreaterThan(0);
  });
});

describe('slopePct', () => {
  it('measures % change over the lookback', () => {
    expect(slopePct([100, null, null, null, 110], 4, 4)).toBeCloseTo(10);
    expect(slopePct([null, 1, 2, 3, 4], 4, 4)).toBeNull();
  });
});

describe('aggregate', () => {
  it('builds weekly OHLCV from daily bars', () => {
    const days = [
      bar(0, 10, 11, 9, 10.5, 1),
      bar(1, 10.5, 12, 10, 11.5, 2),
      bar(2, 11.5, 11.8, 8.5, 9, 3),
      bar(3, 9, 10, 8.8, 9.9, 4),
      bar(4, 9.9, 10.2, 9.5, 10.1, 5),
      bar(5, 10.1, 10.3, 10, 10.2, 6), // incomplete second week: dropped
    ];
    expect(aggregate(days, 5)).toEqual([{ t: 0, o: 10, h: 12, l: 8.5, c: 10.1, v: 15, stage: 1 }]);
  });
});
