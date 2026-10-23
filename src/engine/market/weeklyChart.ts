import { aggregate, withWeeklyStudies } from '../studies';
import { DAYS_PER_WEEK, generateMarket } from './generate';
import type { LegacyWeeklyStudyBar } from './types';

/** Weeks of history shown on the chart. */
export const VISIBLE_WEEKS = 108;
/** Warm-up before the visible window: 52 weeks for Mansfield RS, plus margin. */
export const WARMUP_WEEKS = 60;

export interface WeeklyChartData {
  stock: LegacyWeeklyStudyBar[];
  index: LegacyWeeklyStudyBar[];
}

/** Seeded weekly chart for one stock vs the TYX index, with studies computed on full history. */
export function buildWeeklyChart(seed: number): WeeklyChartData {
  const weeks = VISIBLE_WEEKS + WARMUP_WEEKS;
  const market = generateMarket({ seed, weeks });
  const indexW = aggregate(market.index, DAYS_PER_WEEK);
  const stockW = aggregate(market.stock, DAYS_PER_WEEK);
  const stock = withWeeklyStudies(stockW, indexW).slice(-VISIBLE_WEEKS);
  const index = withWeeklyStudies(indexW, indexW).slice(-VISIBLE_WEEKS);
  return { stock, index };
}
