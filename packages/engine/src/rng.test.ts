import { describe, expect, it } from 'vitest';
import { createRng, createStream, deriveSeed } from './rng';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng(48213);
    const b = createRng(48213);
    const seqA = Array.from({ length: 100 }, () => a.next());
    const seqB = Array.from({ length: 100 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('differs across seeds', () => {
    expect(createRng(1).next()).not.toEqual(createRng(2).next());
  });

  it('stays in [0, 1)', () => {
    const r = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('int() is inclusive on both ends', () => {
    const r = createRng(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2_000; i++) seen.add(r.int(1, 4));
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
  });

  it('restores from saved state', () => {
    const r = createRng(99);
    r.next();
    const state = r.getState();
    const expected = [r.next(), r.next()];
    r.setState(state);
    expect([r.next(), r.next()]).toEqual(expected);
  });

  it('studentT has roughly unit variance', () => {
    const r = createRng(11);
    const n = 20_000;
    let sum = 0;
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const x = r.studentT(4);
      sum += x;
      sumSq += x * x;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(variance).toBeGreaterThan(0.8);
    expect(variance).toBeLessThan(1.25);
  });

  it('gives independent streams per name', () => {
    expect(deriveSeed(42, 'market')).not.toEqual(deriveSeed(42, 'events'));
    // Drawing from one stream never shifts another.
    const events = createStream(42, 'events');
    const market1 = createStream(42, 'market').next();
    events.next();
    events.next();
    const market2 = createStream(42, 'market').next();
    expect(market1).toEqual(market2);
  });
});
