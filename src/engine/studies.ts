import type { LegacyBar, LegacyWeeklyStudyBar } from './market/types';

/** Simple moving average; `null` until there are `n` values. */
export function sma(values: readonly number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i] ?? 0;
    if (i >= n) sum -= values[i - n] ?? 0;
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

/**
 * Mansfield relative strength: (ratio / SMA(ratio, n) − 1) × 10,
 * with ratio = close / indexClose. Positive = outperforming the market.
 */
export function mansfieldRs(
  closes: readonly number[],
  indexCloses: readonly number[],
  n = 52,
): (number | null)[] {
  const ratio = closes.map((c, i) => c / (indexCloses[i] ?? Number.NaN));
  const avg = sma(ratio, n);
  return ratio.map((r, i) => {
    const a = avg[i];
    return a == null || !Number.isFinite(r) ? null : (r / a - 1) * 10;
  });
}

/** % change of a series over `lookback` bars (e.g. the 30w MA slope over 4 weeks). */
export function slopePct(
  values: readonly (number | null)[],
  index: number,
  lookback = 4,
): number | null {
  const now = values[index];
  const before = values[index - lookback];
  if (now == null || before == null || before === 0) return null;
  return ((now - before) / before) * 100;
}

/** Aggregates consecutive groups of `size` bars (e.g. 5 daily bars → 1 weekly bar). */
export function aggregate(bars: readonly LegacyBar[], size: number): LegacyBar[] {
  const out: LegacyBar[] = [];
  for (let i = 0; i + size <= bars.length; i += size) {
    const group = bars.slice(i, i + size);
    const first = group[0];
    const last = group[group.length - 1];
    if (!first || !last) continue;
    out.push({
      t: out.length,
      o: first.o,
      h: Math.max(...group.map((b) => b.h)),
      l: Math.min(...group.map((b) => b.l)),
      c: last.c,
      v: group.reduce((s, b) => s + b.v, 0),
      stage: last.stage,
    });
  }
  return out;
}

/** Weekly bars with the Stage Analysis studies: MA 10w/30w, avg volume 10w, Mansfield RS. */
export function withWeeklyStudies(
  weekly: readonly LegacyBar[],
  indexWeekly: readonly LegacyBar[],
): LegacyWeeklyStudyBar[] {
  const closes = weekly.map((b) => b.c);
  const ma10 = sma(closes, 10);
  const ma30 = sma(closes, 30);
  const avgVol10 = sma(
    weekly.map((b) => b.v),
    10,
  );
  const rs = mansfieldRs(
    closes,
    indexWeekly.map((b) => b.c),
  );
  return weekly.map((b, i) => ({
    ...b,
    ma10: ma10[i] ?? null,
    ma30: ma30[i] ?? null,
    avgVol10: avgVol10[i] ?? null,
    rs: rs[i] ?? null,
  }));
}
