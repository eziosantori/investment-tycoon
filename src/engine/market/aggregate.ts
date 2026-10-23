import type { Bar } from './types';

/**
 * Merges consecutive bars into one: open of the first, highest high, lowest
 * low, close of the last, summed volume. Exact on integer cents and shares.
 * Used for sessions, weeks and the forming bar.
 */
export function mergeBars(bars: readonly Bar[]): Bar {
  const first = bars[0];
  const last = bars[bars.length - 1];
  if (!first || !last) throw new Error('mergeBars needs at least one bar');
  let h = first.h;
  let l = first.l;
  let v = 0;
  for (const b of bars) {
    if (b.h > h) h = b.h;
    if (b.l < l) l = b.l;
    v += b.v;
  }
  return { o: first.o, h, l, c: last.c, v };
}

/** Merges every `size` consecutive bars (e.g. 6 bars → a session). Drops a trailing partial group. */
export function mergeEvery(bars: readonly Bar[], size: number): Bar[] {
  const out: Bar[] = [];
  for (let i = 0; i + size <= bars.length; i += size) out.push(mergeBars(bars.slice(i, i + size)));
  return out;
}
