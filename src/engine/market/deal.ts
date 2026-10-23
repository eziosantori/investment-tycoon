import type { Deal, InstrumentTimeline } from './types';

/**
 * Reads the deal off the hidden stages at the first run week: stocks in Stage
 * 1/2 are setting up, Stage 3/4 are traps. Choosing cycle starting points so
 * the deal is balanced is the generator's job (#5); this only records it.
 */
export function readDeal(
  index: InstrumentTimeline,
  stocks: readonly InstrumentTimeline[],
  firstRunWeek: number,
): Deal {
  const stageAt = (i: InstrumentTimeline) => i.stages[firstRunWeek] ?? 1;
  const settingUp = stocks.filter((s) => stageAt(s) <= 2).map((s) => s.info.ticker);
  const traps = stocks.filter((s) => stageAt(s) >= 3).map((s) => s.info.ticker);
  return {
    settingUp,
    traps,
    indexStage: stageAt(index),
    defaultInstrument: settingUp[0] ?? stocks[0]?.info.ticker ?? index.info.ticker,
  };
}
