/**
 * Public surface of the engine (ADR-0003): the app imports only from here.
 * Add an export when the app needs it; the package's own tests keep using the
 * internal files.
 */

export { ENGINE_VERSION } from './version';

export { generateMarketTimeline } from './market/marketTimeline';
export {
  BAR_MINUTES,
  BARS_PER_SESSION,
  runWeekOfBar,
  SESSION_OPEN_MINUTES,
  SESSIONS_PER_WEEK,
  sessionOfBar,
} from './market/calendar';
export type { Cursor, MarketTimeline, Stage, Ticker, Timeframe } from './market/types';

export {
  advanceBars,
  endCursor,
  isAtEnd,
  nextSessionClose,
  nextWeekClose,
  startCursor,
} from './cursor';

export { LEVELS, parseLevel, type Level } from './chart/tools';
export {
  chartView,
  type ChartBar,
  type ChartView,
  type LockedChip,
  type TimeframeChip,
} from './chart/view';
export { STAGE_LABELS, stageBands } from './chart/stageBands';
export { watchlist } from './chart/watchlist';
