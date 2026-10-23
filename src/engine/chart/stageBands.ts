import type { Stage } from '../market/types';

/**
 * Hidden-stage bands: runs of consecutive bars in the same hidden stage, as
 * drawn behind the chart by the dev overlay and the gallery. Never shown in play.
 */
export interface StageBand {
  stage: Stage;
  /** First bar of the run (position in the window). */
  from: number;
  /** One past the last bar of the run. */
  to: number;
}

/** Short band labels, as on the token sheet. */
export const STAGE_LABELS: Readonly<Record<Stage, string>> = {
  1: '1 BASE',
  2: '2 ADV',
  3: '3 TOP',
  4: '4 DEC',
};

/** Bands for a window of stages, or of bars carrying their stage (e.g. `ChartView.bars`). */
export function stageBands(window: readonly (Stage | { stage: Stage })[]): StageBand[] {
  const bands: StageBand[] = [];
  window.forEach((item, i) => {
    const stage = typeof item === 'number' ? item : item.stage;
    const last = bands[bands.length - 1];
    if (last && last.stage === stage) last.to = i + 1;
    else bands.push({ stage, from: i, to: i + 1 });
  });
  return bands;
}
