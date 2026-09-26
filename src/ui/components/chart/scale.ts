/** A "nice" tick step (1, 2, 2.5, 5 × 10^k) giving roughly `target` ticks over the range. */
export function niceStep(range: number, target = 6): number {
  if (!(range > 0)) return 1;
  const raw = range / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / pow;
  const nice = norm < 1.5 ? 1 : norm < 2.25 ? 2 : norm < 3.5 ? 2.5 : norm < 7.5 ? 5 : 10;
  return nice * pow;
}

export function ticks(min: number, max: number, target = 6): number[] {
  const step = niceStep(max - min, target);
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    out.push(Math.round(v / step) * step);
  }
  return out;
}

/** Linear map from [d0, d1] to [r0, r1]. */
export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}
