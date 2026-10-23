import { describe, expect, it } from 'vitest';
import { mansfieldRs, slopePct, sma } from './studies';

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
