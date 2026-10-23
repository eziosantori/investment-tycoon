import { mansfieldRs, slopePct, sma } from '../studies';
import { mergeEvery } from './aggregate';
import { BARS_PER_SESSION, BARS_PER_WEEK } from './calendar';
import type { Bar, InstrumentInfo, InstrumentTimeline, Stage, WeeklyStudies } from './types';

/**
 * Builds an instrument's timeline from its 65m bars and weekly hidden stages:
 * aggregates sessions and weeks, and computes the weekly studies on closed
 * weeks. Every generator (fake or real) goes through here, so the timeline
 * shape is the same whatever produced the bars.
 *
 * @param indexWeeks the index's week bars, for Mansfield RS; `null` for the index itself.
 */
export function assembleInstrument(
  info: InstrumentInfo,
  bars: Bar[],
  stages: Stage[],
  indexWeeks: readonly Bar[] | null,
): InstrumentTimeline {
  if (bars.length !== stages.length * BARS_PER_WEEK) {
    throw new Error(`${info.ticker}: ${bars.length} bars for ${stages.length} weeks`);
  }
  const sessions = mergeEvery(bars, BARS_PER_SESSION);
  const weeks = mergeEvery(bars, BARS_PER_WEEK);
  return { info, bars, sessions, weeks, studies: weeklyStudies(weeks, indexWeeks), stages };
}

/** Weekly studies; entry `w` uses weeks `0..w` only. */
export function weeklyStudies(
  weeks: readonly Bar[],
  indexWeeks: readonly Bar[] | null,
): WeeklyStudies {
  const closes = weeks.map((w) => w.c);
  const ma30 = sma(closes, 30);
  return {
    ma10: sma(closes, 10),
    ma30,
    avgVol10: sma(
      weeks.map((w) => w.v),
      10,
    ),
    rs: indexWeeks
      ? mansfieldRs(
          closes,
          indexWeeks.map((w) => w.c),
        )
      : closes.map(() => null),
    ma30Slope: ma30.map((_, i) => slopePct(ma30, i, 4)),
  };
}
