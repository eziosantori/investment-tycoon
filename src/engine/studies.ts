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
