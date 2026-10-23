import { createStream } from '../rng';
import type { DealParams } from './params';
import type { AnchorTarget } from './stageCycle';
import type { Deal, InstrumentTimeline, Stage } from './types';

/**
 * The deal (M1 spec, "Deal"): at the first run bar at least a few stocks are
 * setting up (late Stage 1 / early Stage 2), some are in Stage 3/4, and the
 * index is not in Stage 4. `dealTargets` decides what each stock must be;
 * the stage cycle then chooses a matching starting point (`chooseAnchor`).
 * `readDeal` records the outcome from the hidden stages.
 */

/**
 * What each stock (by position in the universe) is dealt, from the seed's
 * `deal` stream. Depends only on the seed and the number of stocks, so tuning
 * one stock never moves another one's target.
 */
export function dealTargets(seed: number, stockCount: number, p: DealParams): AnchorTarget[] {
  const rng = createStream(seed, 'deal');
  const settingUp = Math.min(stockCount, rng.int(p.settingUp[0], p.settingUp[1]));
  const traps = Math.min(stockCount - settingUp, rng.int(p.traps[0], p.traps[1]));
  const order = Array.from({ length: stockCount }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const targets: AnchorTarget[] = new Array<AnchorTarget>(stockCount).fill('free');
  order.forEach((stock, rank) => {
    if (rank < settingUp) targets[stock] = 'settingUp';
    else if (rank < settingUp + traps) targets[stock] = 'trap';
  });
  return targets;
}

/** Late Stage 1 (the base ends soon) or early Stage 2 (it just began), at `week`. */
export function isSettingUp(stages: readonly Stage[], week: number, p: DealParams): boolean {
  const stage = stages[week];
  if (stage === 1) return stages.slice(week + 1, week + 1 + p.lateBaseWeeks).some((s) => s !== 1);
  if (stage === 2) {
    return stages.slice(Math.max(0, week - p.earlyAdvanceWeeks), week).some((s) => s !== 2);
  }
  return false;
}

/**
 * Reads the deal off the hidden stages at the first run week: stocks in late
 * Stage 1 / early Stage 2 are setting up, Stage 3/4 are traps.
 */
export function readDeal(
  index: InstrumentTimeline,
  stocks: readonly InstrumentTimeline[],
  firstRunWeek: number,
  p: DealParams,
): Deal {
  const stageAt = (i: InstrumentTimeline) => i.stages[firstRunWeek] ?? 1;
  const settingUp = stocks
    .filter((s) => isSettingUp(s.stages, firstRunWeek, p))
    .map((s) => s.info.ticker);
  const traps = stocks.filter((s) => stageAt(s) >= 3).map((s) => s.info.ticker);
  return {
    settingUp,
    traps,
    indexStage: stageAt(index),
    defaultInstrument: settingUp[0] ?? stocks[0]?.info.ticker ?? index.info.ticker,
  };
}
