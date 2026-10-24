import type { MarketTimeline, Timeframe } from './types';

/**
 * Market calendar (M1 spec, "Calendar"): 6 bars of 65m per session
 * (09:30 → 16:00), 5 sessions per week, no holidays. Bars, sessions and weeks
 * are indexed globally from the first warm-up bar, so bar `b` belongs to
 * session `⌊b / 6⌋` and week `⌊b / 30⌋`.
 */

export const BAR_MINUTES = 65;
export const BARS_PER_SESSION = 6;
export const SESSIONS_PER_WEEK = 5;
export const BARS_PER_WEEK = BARS_PER_SESSION * SESSIONS_PER_WEEK;
/** Session open, in minutes after midnight (09:30). */
export const SESSION_OPEN_MINUTES = 9 * 60 + 30;

/** Warm-up weeks: 108 visible on the W chart plus 52 so every visible week has RS. */
export const WARMUP_WEEKS = 160;
export const RUN_WEEKS = 10;

/** How many 65m bars one bar of each timeframe spans. */
export const BARS_PER_UNIT: Readonly<Record<Timeframe, number>> = {
  '65m': 1,
  D: BARS_PER_SESSION,
  W: BARS_PER_WEEK,
};

export function totalWeeks(timeline: Pick<MarketTimeline, 'warmupWeeks' | 'runWeeks'>): number {
  return timeline.warmupWeeks + timeline.runWeeks;
}

export function sessionOfBar(bar: number): number {
  return Math.floor(bar / BARS_PER_SESSION);
}

export function weekOfBar(bar: number): number {
  return Math.floor(bar / BARS_PER_WEEK);
}

/**
 * The run week (1-based) a bar belongs to; 0 or negative during the warm-up.
 */
export function runWeekOfBar(timeline: Pick<MarketTimeline, 'warmupWeeks'>, bar: number): number {
  return weekOfBar(bar) - timeline.warmupWeeks + 1;
}
