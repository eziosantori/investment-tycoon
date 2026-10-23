import type { Rng } from '../rng';
import type { DealParams, StageCycleParams } from './params';
import type { Stage } from './types';

/**
 * Hidden stage cycle: a semi-Markov chain at weekly granularity,
 * 1 → 2 → 3 → 4 → 1, with three failure branches: 1 → 4 breakdown,
 * 2 → 1 failed breakout (a short Stage 2 right after a breakout) and
 * 3 → 2 re-accumulation. Parameters: `./params` (`StageCycleParams`).
 *
 * A timeline is built around an anchor: the segment the instrument is in at a
 * given week (the first run week, for the deal) and how far into it. The cycle
 * runs forward from the anchor to the end and backward, through the reversed
 * chain, to week 0. So the deal is achieved by choosing starting points, never
 * by rejecting seeds.
 */

/**
 * A stretch of the cycle spent in one stage. A failed breakout is its own
 * segment: a short Stage 2 that always falls back into a base.
 */
export type SegmentKind = 'base' | 'advance' | 'failedBreakout' | 'top' | 'decline';

const STAGE_OF: Readonly<Record<SegmentKind, Stage>> = {
  base: 1,
  advance: 2,
  failedBreakout: 2,
  top: 3,
  decline: 4,
};

const KINDS: readonly SegmentKind[] = ['base', 'advance', 'failedBreakout', 'top', 'decline'];

/** Where an instrument is in its cycle at the anchor week. */
export interface CycleAnchor {
  kind: SegmentKind;
  /** Length of the whole segment, in weeks. */
  duration: number;
  /** Weeks of the segment before the anchor week (0 = the segment starts at it). */
  elapsed: number;
}

/**
 * What the deal asks of an instrument at the anchor week:
 * - `settingUp`: late Stage 1 or early Stage 2
 * - `trap`: Stage 3 or 4
 * - `notDeclining`: anything but Stage 4 (the index)
 * - `free`: anywhere in the cycle
 */
export type AnchorTarget = 'settingUp' | 'trap' | 'notDeclining' | 'free';

function durationRange(kind: SegmentKind, p: StageCycleParams): readonly [number, number] {
  return kind === 'failedBreakout' ? p.failedBreakoutWeeks : p.durations[STAGE_OF[kind]];
}

function drawDuration(kind: SegmentKind, p: StageCycleParams, rng: Rng): number {
  const [lo, hi] = durationRange(kind, p);
  return rng.int(lo, hi);
}

function pick<T>(rng: Rng, weighted: readonly (readonly [T, number])[]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [item, w] of weighted) {
    r -= w;
    if (r < 0) return item;
  }
  return weighted[weighted.length - 1]![0];
}

/** The segment that follows `kind`, with the failure branches. */
function nextKind(kind: SegmentKind, p: StageCycleParams, rng: Rng): SegmentKind {
  switch (kind) {
    case 'base':
      if (rng.chance(p.pBreakdown)) return 'decline';
      return rng.chance(p.pFailedBreakout) ? 'failedBreakout' : 'advance';
    case 'advance':
      return 'top';
    case 'failedBreakout':
      return 'base';
    case 'top':
      return rng.chance(p.pReaccumulation) ? 'advance' : 'decline';
    case 'decline':
      return 'base';
  }
}

/**
 * Relative frequency of each segment kind in the long run (stationary
 * distribution of the chain of segments, with `base` = 1).
 */
function segmentFrequency(p: StageCycleParams): Record<SegmentKind, number> {
  const breakout = 1 - p.pBreakdown;
  const advance = (breakout * (1 - p.pFailedBreakout)) / (1 - p.pReaccumulation);
  return {
    base: 1,
    advance,
    failedBreakout: breakout * p.pFailedBreakout,
    top: advance,
    decline: p.pBreakdown + advance * (1 - p.pReaccumulation),
  };
}

/** The segment before `kind`, drawn from the reversed chain. */
function previousKind(kind: SegmentKind, p: StageCycleParams, rng: Rng): SegmentKind {
  const f = segmentFrequency(p);
  switch (kind) {
    case 'base':
      return pick(rng, [
        ['failedBreakout', f.failedBreakout],
        ['decline', f.decline],
      ]);
    case 'advance':
      return pick(rng, [
        ['base', (1 - p.pBreakdown) * (1 - p.pFailedBreakout)],
        ['top', f.top * p.pReaccumulation],
      ]);
    case 'failedBreakout':
      return 'base';
    case 'top':
      return 'advance';
    case 'decline':
      return pick(rng, [
        ['base', p.pBreakdown],
        ['top', f.top * (1 - p.pReaccumulation)],
      ]);
  }
}

/** Share of time spent in each kind: frequency × mean duration. */
function timeShare(kinds: readonly SegmentKind[], p: StageCycleParams) {
  const f = segmentFrequency(p);
  return kinds.map((k) => {
    const [lo, hi] = durationRange(k, p);
    return [k, (f[k] * (lo + hi)) / 2] as const;
  });
}

/** Chooses where in its cycle an instrument is at the anchor week, as the deal asks. */
export function chooseAnchor(
  target: AnchorTarget,
  p: StageCycleParams,
  deal: DealParams,
  rng: Rng,
): CycleAnchor {
  if (target === 'settingUp') {
    if (rng.chance(0.5)) {
      const duration = drawDuration('base', p, rng);
      const elapsed = rng.int(Math.max(0, duration - deal.lateBaseWeeks), duration - 1);
      return { kind: 'base', duration, elapsed };
    }
    const duration = drawDuration('advance', p, rng);
    const elapsed = rng.int(0, Math.min(deal.earlyAdvanceWeeks, duration) - 1);
    return { kind: 'advance', duration, elapsed };
  }
  const kinds =
    target === 'trap'
      ? KINDS.filter((k) => STAGE_OF[k] >= 3)
      : target === 'notDeclining'
        ? KINDS.filter((k) => STAGE_OF[k] !== 4)
        : KINDS;
  const kind = pick(rng, timeShare(kinds, p));
  const duration = drawDuration(kind, p, rng);
  return { kind, duration, elapsed: rng.int(0, duration - 1) };
}

/**
 * Hidden stage of each of `weeks` weeks, with the instrument at `anchor` in
 * week `anchorWeek`: the cycle runs backward to week 0 and forward to the end.
 */
export function buildStages(
  weeks: number,
  anchorWeek: number,
  anchor: CycleAnchor,
  p: StageCycleParams,
  rng: Rng,
): Stage[] {
  const out: Stage[] = new Array<Stage>(weeks).fill(1);
  const fill = (kind: SegmentKind, from: number, to: number) => {
    for (let w = Math.max(0, from); w < Math.min(weeks, to); w++) out[w] = STAGE_OF[kind];
  };

  const start = anchorWeek - anchor.elapsed;
  fill(anchor.kind, start, start + anchor.duration);

  let kind = anchor.kind;
  for (let s = start; s > 0;) {
    kind = previousKind(kind, p, rng);
    const d = drawDuration(kind, p, rng);
    fill(kind, s - d, s);
    s -= d;
  }

  kind = anchor.kind;
  for (let e = start + anchor.duration; e < weeks;) {
    kind = nextKind(kind, p, rng);
    const d = drawDuration(kind, p, rng);
    fill(kind, e, e + d);
    e += d;
  }
  return out;
}
