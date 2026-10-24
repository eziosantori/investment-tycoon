/**
 * Seeded PRNG (mulberry32) with named, independent streams.
 * `Math.random()` is banned in the engine: every random draw goes through here
 * so a seed always reproduces the same market (docs/ARCHITECTURE.md §2).
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max] (inclusive). */
  int(min: number, max: number): number;
  /** Standard normal (Box–Muller). */
  normal(): number;
  /** Student-t scaled to unit variance (fat tails). Requires df > 2. */
  studentT(df: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Serializable internal state, for saves. */
  getState(): number;
  setState(state: number): void;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;

  const next = (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (): number => {
    // 1 - next() is in (0, 1], so the log is always finite.
    const u = 1 - next();
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    normal,
    studentT(df) {
      let chi2 = 0;
      for (let i = 0; i < df; i++) chi2 += normal() ** 2;
      const t = normal() / Math.sqrt(chi2 / df);
      return t * Math.sqrt((df - 2) / df);
    },
    chance: (p) => next() < p,
    getState: () => a,
    setState(state) {
      a = state | 0;
    },
  };
}

/** 32-bit FNV-1a hash mixed with the seed, so each stream gets its own sequence. */
export function deriveSeed(seed: number, stream: string): number {
  let h = 0x811c9dc5 ^ (seed >>> 0);
  for (let i = 0; i < stream.length; i++) {
    h ^= stream.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // Final avalanche so nearby seeds diverge quickly.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

export function createStream(seed: number, stream: string): Rng {
  return createRng(deriveSeed(seed, stream));
}
