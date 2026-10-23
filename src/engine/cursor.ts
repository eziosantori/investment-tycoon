import { BARS_PER_SESSION, BARS_PER_WEEK, totalWeeks } from './market/calendar';
import type { Cursor, MarketTimeline } from './market/types';

/**
 * Pure cursor helpers for playback. The cursor is the global index of the last
 * revealed 65m bar (see `Cursor`); every helper clamps to the timeline.
 */

type Span = Pick<MarketTimeline, 'warmupWeeks' | 'runWeeks'>;

/** Where a run starts: the last warm-up bar, so run week 1 is still unseen. */
export function startCursor(timeline: Span): Cursor {
  return timeline.warmupWeeks * BARS_PER_WEEK - 1;
}

/** The last bar of the last run week. */
export function endCursor(timeline: Span): Cursor {
  return totalWeeks(timeline) * BARS_PER_WEEK - 1;
}

export function clampCursor(timeline: Span, cursor: number): Cursor {
  return Math.min(endCursor(timeline), Math.max(0, Math.floor(cursor)));
}

export function isAtEnd(timeline: Span, cursor: Cursor): boolean {
  return cursor >= endCursor(timeline);
}

export function advanceBars(timeline: Span, cursor: Cursor, n: number): Cursor {
  return clampCursor(timeline, cursor + n);
}

/** The next bar that closes a group of `size` bars, strictly after the cursor. */
function nextClose(timeline: Span, cursor: Cursor, size: number): Cursor {
  // The close of the group that holds the next bar.
  return clampCursor(timeline, Math.floor((cursor + 1) / size) * size + size - 1);
}

/** Jumps to the close of the current session, or of the next one if already at a close. */
export function nextSessionClose(timeline: Span, cursor: Cursor): Cursor {
  return nextClose(timeline, cursor, BARS_PER_SESSION);
}

/** Jumps to the close of the current week, or of the next one if already at a close. */
export function nextWeekClose(timeline: Span, cursor: Cursor): Cursor {
  return nextClose(timeline, cursor, BARS_PER_WEEK);
}
