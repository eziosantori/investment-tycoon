/** Playback speeds: 1× is one 65m bar per second. */
export type Speed = 1 | 2 | 5;

export const SPEEDS: readonly Speed[] = [1, 2, 5];

const MS_PER_BAR_AT_1X = 1000;
/** Longest frame gap counted, so a backgrounded tab doesn't fast-forward on return. */
const MAX_FRAME_MS = 1000;

/**
 * One animation frame of playback: accumulates real time × speed and says how
 * many whole bars to advance, carrying the remainder to the next frame.
 */
export function tickPlayback(
  carryMs: number,
  frameMs: number,
  speed: Speed,
): { bars: number; carryMs: number } {
  const total = carryMs + Math.min(frameMs, MAX_FRAME_MS) * speed;
  const bars = Math.floor(total / MS_PER_BAR_AT_1X);
  return { bars, carryMs: total - bars * MS_PER_BAR_AT_1X };
}
