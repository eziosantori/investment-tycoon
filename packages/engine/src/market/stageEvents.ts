import type { Bar, Stage } from './types';

/**
 * Reads the stage signatures back out of an instrument's week bars, from the
 * outside: what a chart reader would measure at each hidden stage transition.
 * The statistical suite pins the market's character with these numbers, and
 * dev tools can print them; generation never uses them.
 *
 * Levels are weekly closes: a base's resistance is the highest close of its
 * Stage 1 weeks (a failed breakout's Stage 2 weeks don't count, the base goes
 * on), its support the lowest; a top's support is the lowest close of its
 * Stage 3 weeks. Volume ratios are against the average of the 10 weeks before
 * the transition.
 */

/** A base breaking out: Stage 1 → 2. */
export interface Breakout {
  week: number;
  /** Breakout-week volume ÷ the previous 10 weeks' average. */
  volumeRatio: number;
  /** The 2 following weeks' volume ÷ the same average. */
  followRatios: number[];
  /** Breakout-week open ÷ previous close − 1. */
  gap: number;
  /** Breakout-week close ÷ the base's resistance − 1 (> 0: closed above). */
  overResistance: number;
  /** The advance fails: its Stage 2 ends back in Stage 1. */
  failed: boolean;
  /** Failed only: weeks from the breakout to the first close back at or below resistance. */
  weeksBackInBase: number | null;
  /** Failed only: volume of that week ÷ the pre-breakout average. */
  backInBaseVolumeRatio: number | null;
}

/** A base or a top breaking down: Stage 1 → 4 or 3 → 4. */
export interface Breakdown {
  week: number;
  from: 1 | 3;
  volumeRatio: number;
  gap: number;
  /** Breakdown-week close ÷ support − 1 (< 0: closed below). */
  underSupport: number;
}

export interface StageEvents {
  breakouts: Breakout[];
  breakdowns: Breakdown[];
}

const LOOKBACK = 10;

function avgVolumeBefore(weeks: readonly Bar[], w: number): number | null {
  if (w < LOOKBACK) return null;
  let sum = 0;
  for (let i = w - LOOKBACK; i < w; i++) sum += weeks[i]!.v;
  return sum / LOOKBACK;
}

/** Index of the first week after `w` whose stage differs from `stages[w]`, or the length. */
function runEnd(stages: readonly Stage[], w: number): number {
  let e = w;
  while (e < stages.length && stages[e] === stages[w]) e++;
  return e;
}

export function measureStageEvents(weeks: readonly Bar[], stages: readonly Stage[]): StageEvents {
  const breakouts: Breakout[] = [];
  const breakdowns: Breakdown[] = [];
  let baseHigh = -Infinity;
  let baseLow = Infinity;
  let topLow = Infinity;

  for (let w = 0; w < stages.length; w++) {
    const stage = stages[w]!;
    const prev = w > 0 ? stages[w - 1]! : null;
    const bar = weeks[w]!;

    if (prev != null && prev !== stage) {
      const avg = avgVolumeBefore(weeks, w);
      const gap = bar.o / weeks[w - 1]!.c - 1;
      if (avg != null && prev === 1 && stage === 2 && Number.isFinite(baseHigh)) {
        const end = runEnd(stages, w);
        const failed = stages[end] === 1;
        let back: number | null = null;
        if (failed) {
          for (let k = w + 1; k < Math.min(stages.length, end + 6); k++) {
            if (weeks[k]!.c <= baseHigh) {
              back = k;
              break;
            }
          }
        }
        breakouts.push({
          week: w,
          volumeRatio: bar.v / avg,
          followRatios: [1, 2].filter((d) => w + d < end).map((d) => weeks[w + d]!.v / avg),
          gap,
          overResistance: bar.c / baseHigh - 1,
          failed,
          weeksBackInBase: back == null ? null : back - w,
          backInBaseVolumeRatio: back == null ? null : weeks[back]!.v / avg,
        });
      }
      if (avg != null && stage === 4 && (prev === 1 || prev === 3)) {
        const support = prev === 1 ? baseLow : topLow;
        if (Number.isFinite(support)) {
          breakdowns.push({
            week: w,
            from: prev,
            volumeRatio: bar.v / avg,
            gap,
            underSupport: bar.c / support - 1,
          });
        }
      }
    }

    // Track the levels of the current base and top.
    if (stage === 1) {
      const failedReturn = prev === 2 && isFailedAdvance(stages, w);
      if (prev !== 1 && !failedReturn) {
        baseHigh = -Infinity;
        baseLow = Infinity;
      }
      baseHigh = Math.max(baseHigh, bar.c);
      baseLow = Math.min(baseLow, bar.c);
    } else if (stage === 3) {
      if (prev !== 3) topLow = Infinity;
      topLow = Math.min(topLow, bar.c);
    }
  }
  return { breakouts, breakdowns };
}

/** Week `w` starts a Stage 1 right after a Stage 2 that itself followed a Stage 1. */
function isFailedAdvance(stages: readonly Stage[], w: number): boolean {
  let s = w - 1;
  while (s >= 0 && stages[s] === 2) s--;
  return s >= 0 && stages[s] === 1;
}
