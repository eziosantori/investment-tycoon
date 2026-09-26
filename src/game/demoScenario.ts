import type { WeeklyStudyBar } from '../engine/market/types';
import { slopePct } from '../engine/studies';

/**
 * M0 only: a hypothetical open long position placed on the generated chart, so
 * the loadout, the chart tags and the active-position card show consistent
 * numbers. Replaced by real orders and accounting in M2–M3.
 */

export interface DemoPosition {
  side: 'long';
  entryIndex: number;
  entry: number;
  stop: number;
  target: number;
  riskPct: number;
  riskBudget: number;
  size: number;
  riskIfStopped: number;
  last: number;
  openPnl: number;
  openR: number;
}

export interface SetupCheck {
  label: string;
  ok: boolean;
}

export interface DemoScenario {
  ticker: string;
  equity: number;
  position: DemoPosition;
  lastChangePct: number;
  ma10: number | null;
  ma30: number | null;
  ma30SlopePct: number | null;
  breakoutVolume: number | null;
  checks: SetupCheck[];
}

const BALANCE = 102_410;
const RISK_PCT = 1;
/** How far back (in weeks) to look for a demo entry. */
const ENTRY_WINDOW = [2, 30] as const;

interface Plan {
  entryIndex: number;
  entry: number;
  stop: number;
  target: number;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Long entry at a bar's close, stop under the prior 6-week low (8% if that's too tight/wide), target +2R. */
function planAt(bars: readonly WeeklyStudyBar[], entryIndex: number): Plan | null {
  const bar = bars[entryIndex];
  if (!bar) return null;
  const entry = bar.c;
  const recentLow = Math.min(
    ...bars.slice(Math.max(0, entryIndex - 6), entryIndex + 1).map((b) => b.l),
  );
  let stop = Math.floor(recentLow * 0.99 * 100) / 100;
  if (stop >= entry * 0.97 || stop <= entry * 0.8) stop = round2(entry * 0.92);
  return { entryIndex, entry, stop, target: round2(entry + 2 * (entry - stop)) };
}

/** Still open today: never touched the stop or the target after entry. */
function stillOpen(bars: readonly WeeklyStudyBar[], plan: Plan): boolean {
  return bars.slice(plan.entryIndex + 1).every((b) => b.l > plan.stop && b.h < plan.target);
}

/** How textbook the entry bar is: above a rising 30w MA, on volume, with positive RS. */
function setupScore(bars: readonly WeeklyStudyBar[], i: number): number {
  const b = bars[i];
  if (!b) return 0;
  const slope = slopePct(
    bars.map((x) => x.ma30),
    i,
    4,
  );
  return (
    Number(b.ma30 != null && b.c > b.ma30) +
    Number(slope != null && slope > 0) +
    Number(b.avgVol10 != null && b.v >= 1.5 * b.avgVol10) +
    Number((b.rs ?? -1) >= 0)
  );
}

/**
 * Picks the most textbook recent entry that would still be open, so the demo
 * never shows a position that should already have been stopped out.
 */
function pickPlan(bars: readonly WeeklyStudyBar[]): Plan {
  const lastIndex = bars.length - 1;
  let best: { plan: Plan; score: number } | null = null;
  for (let ago = ENTRY_WINDOW[0]; ago <= ENTRY_WINDOW[1]; ago++) {
    const plan = planAt(bars, lastIndex - ago);
    if (!plan || !stillOpen(bars, plan)) continue;
    const score = setupScore(bars, plan.entryIndex);
    if (!best || score > best.score) best = { plan, score };
  }
  if (best) return best.plan;
  // Fallback: enter at this week's close with an 8% stop (open R = 0).
  const entry = bars[lastIndex]?.c ?? 1;
  const stop = round2(entry * 0.92);
  return { entryIndex: lastIndex, entry, stop, target: round2(entry + 2 * (entry - stop)) };
}

export function buildDemoScenario(bars: readonly WeeklyStudyBar[]): DemoScenario {
  const lastIndex = bars.length - 1;
  const last = bars[lastIndex];
  const prev = bars[lastIndex - 1];
  if (!last || !prev) throw new Error('Not enough bars for the demo scenario');

  const { entryIndex, entry, stop, target } = pickPlan(bars);
  const entryBar = bars[entryIndex] ?? last;
  const perShare = entry - stop;

  // Sized at entry from the closed balance: qty = floor(balance × risk% / |entry − stop|).
  const riskBudget = (BALANCE * RISK_PCT) / 100;
  const size = Math.floor(riskBudget / perShare);
  const openPnl = (last.c - entry) * size;

  const ma30Slope = slopePct(
    bars.map((b) => b.ma30),
    lastIndex,
    4,
  );
  const breakoutVolume = entryBar.avgVol10 ? entryBar.v / entryBar.avgVol10 : null;

  return {
    ticker: 'KRVX',
    equity: BALANCE + openPnl,
    position: {
      side: 'long',
      entryIndex,
      entry,
      stop,
      target,
      riskPct: RISK_PCT,
      riskBudget,
      size,
      riskIfStopped: perShare * size,
      last: last.c,
      openPnl,
      openR: openPnl / (perShare * size),
    },
    lastChangePct: ((last.c - prev.c) / prev.c) * 100,
    ma10: last.ma10,
    ma30: last.ma30,
    ma30SlopePct: ma30Slope,
    breakoutVolume,
    checks: [
      { label: 'Above 30w MA', ok: last.ma30 != null && last.c > last.ma30 },
      { label: '30w MA rising', ok: ma30Slope != null && ma30Slope > 0 },
      {
        label: `Volume ${breakoutVolume?.toFixed(1) ?? '–'}×`,
        ok: breakoutVolume != null && breakoutVolume >= 2,
      },
      {
        label: last.rs != null && last.rs >= 0 ? 'RS above 0' : 'RS below 0',
        ok: (last.rs ?? -1) >= 0,
      },
    ],
  };
}
