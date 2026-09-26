import type { Rng } from '../rng';
import type { Stage } from './types';

/**
 * Hidden stage cycle as a semi-Markov chain at weekly granularity:
 * 1 → 2 → 3 → 4 → 1, with failure branches (1 → 4 breakdown, 3 → 2 re-accumulation).
 * See docs/ARCHITECTURE.md §5.
 */

export interface StageProfile {
  /** Min/max duration of each stage, in weeks. */
  durations: Record<Stage, readonly [number, number]>;
  /** Probability that a base breaks down (1 → 4) instead of breaking out. */
  pBaseBreakdown: number;
  /** Probability that a top resolves back up (3 → 2) instead of down. */
  pTopReaccumulation: number;
}

export const STOCK_STAGES: StageProfile = {
  durations: { 1: [20, 60], 2: [20, 70], 3: [8, 25], 4: [15, 50] },
  pBaseBreakdown: 0.15,
  pTopReaccumulation: 0.2,
};

export const INDEX_STAGES: StageProfile = {
  durations: { 1: [15, 40], 2: [40, 120], 3: [8, 20], 4: [15, 45] },
  pBaseBreakdown: 0.1,
  pTopReaccumulation: 0.3,
};

export function nextStage(stage: Stage, profile: StageProfile, rng: Rng): Stage {
  switch (stage) {
    case 1:
      return rng.chance(profile.pBaseBreakdown) ? 4 : 2;
    case 2:
      return 3;
    case 3:
      return rng.chance(profile.pTopReaccumulation) ? 2 : 4;
    case 4:
      return 1;
  }
}

/** Builds a stage per week for `weeks` weeks, starting at a random point of the cycle. */
export function buildStageTimeline(weeks: number, profile: StageProfile, rng: Rng): Stage[] {
  const out: Stage[] = [];
  let stage = rng.int(1, 4) as Stage;
  // Start partway through the first stage so runs don't all begin at a boundary.
  const [min, max] = profile.durations[stage];
  let left = rng.int(1, max - Math.floor(min / 2));
  while (out.length < weeks) {
    out.push(stage);
    left -= 1;
    if (left <= 0) {
      stage = nextStage(stage, profile, rng);
      const [lo, hi] = profile.durations[stage];
      left = rng.int(lo, hi);
    }
  }
  return out;
}
