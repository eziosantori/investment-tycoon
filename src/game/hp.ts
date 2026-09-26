/**
 * Loss limits shown as HP bars (design handoff, "HP mapping" and "HP states").
 * HP = remaining limit / limit × 100.
 */

export type HpState = 'safe' | 'warning' | 'critical' | 'breached';

/** `usedPct` and `limitPct` are positive magnitudes, e.g. 2.1 of 5.0. */
export function hpFromLoss(usedPct: number, limitPct: number): number {
  if (limitPct <= 0) return 0;
  const hp = ((limitPct - usedPct) / limitPct) * 100;
  return Math.round(Math.min(100, Math.max(0, hp)));
}

export function hpState(hp: number): HpState {
  if (hp <= 0) return 'breached';
  if (hp < 30) return 'critical';
  if (hp <= 60) return 'warning';
  return 'safe';
}
