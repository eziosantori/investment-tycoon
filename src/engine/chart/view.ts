import { clampCursor } from '../cursor';
import { mergeBars } from '../market/aggregate';
import { BARS_PER_UNIT, BARS_PER_WEEK } from '../market/calendar';
import { findInstrument } from '../market/marketTimeline';
import type {
  Bar,
  Cursor,
  InstrumentInfo,
  InstrumentTimeline,
  MarketTimeline,
  Stage,
  Ticker,
  Timeframe,
} from '../market/types';
import { quoteAt, type Quote } from './quote';
import {
  isUnlocked,
  TIMEFRAMES,
  TOOL_LABELS,
  toolsForLevel,
  unlockLevel,
  type ChartTool,
  type Level,
} from './tools';

/**
 * The chart view: a pure function from (timeline, cursor, instrument,
 * timeframe, level) to everything the chart draws. React components only
 * render it. Tests for the chart live at this seam.
 */

/** Visible bars per timeframe: about 2 years on W, 6 months on D, 4 weeks on 65m. */
export const WINDOW: Readonly<Record<Timeframe, number>> = { W: 108, D: 120, '65m': 120 };

export interface ChartViewInput {
  timeline: MarketTimeline;
  cursor: Cursor;
  instrument: Ticker;
  timeframe: Timeframe;
  level: Level;
}

/** One bar of the visible window, with its studies. */
export interface ChartBar extends Bar {
  /** Global index in the timeframe's series (week, session or 65m bar). */
  index: number;
  /** True for the bar still being built up to the cursor. At most the last bar. */
  forming: boolean;
  /** Hidden stage of the bar's week. Never shown during play (dev tools only). */
  stage: Stage;
  /**
   * Weekly studies as of this bar's close; `null` on the forming bar (studies
   * use closed bars only) and, in M1 #2, on D and 65m bars.
   */
  ma10: number | null;
  ma30: number | null;
  avgVol10: number | null;
  rs: number | null;
}

/** What the chart draws, after level gating. */
export interface ChartLayers {
  price: 'line' | 'candles';
  ma30: boolean;
  ma10: boolean;
  volume: boolean;
  /** Mansfield RS pane: never for the index, never on D or 65m. */
  rs: boolean;
}

/** A tool shown as a dashed "Lv N" chip because the player hasn't unlocked it. */
export interface LockedChip {
  tool: Exclude<ChartTool, Timeframe>;
  label: string;
  level: Level;
  /** True for the tools of the next level to unlock (highlighted "next unlock" chip). */
  next: boolean;
}

export interface TimeframeChip {
  timeframe: Timeframe;
  /** Level it unlocks at. */
  level: Level;
  locked: boolean;
  active: boolean;
}

export interface ChartView {
  instrument: InstrumentInfo;
  /** The timeframe drawn: the requested one, or W if that one is locked. */
  timeframe: Timeframe;
  cursor: Cursor;
  /** Visible window, oldest first, ending at the cursor (forming bar last if any). */
  bars: ChartBar[];
  layers: ChartLayers;
  /** Locked overlay/pane/price-style tools, in unlock order. */
  locked: LockedChip[];
  timeframes: TimeframeChip[];
  quote: Quote;
}

const GATED_TOOLS = ['ma30', 'candles', 'volume', 'ma10', 'rs'] as const;

export function chartView(input: ChartViewInput): ChartView {
  const { timeline, level } = input;
  const inst =
    findInstrument(timeline, input.instrument) ??
    findInstrument(timeline, timeline.deal.defaultInstrument) ??
    timeline.index;
  const cursor = clampCursor(timeline, input.cursor);
  const tools = toolsForLevel(level);
  const timeframe = tools.timeframes.includes(input.timeframe) ? input.timeframe : 'W';
  const rsAvailable = inst.info.kind === 'stock' && timeframe === 'W';

  return {
    instrument: inst.info,
    timeframe,
    cursor,
    bars: windowBars(inst, cursor, timeframe),
    layers: {
      price: tools.price,
      ma30: tools.ma30,
      ma10: tools.ma10,
      volume: tools.volume,
      rs: tools.rs && rsAvailable,
    },
    locked: lockedChips(level, rsAvailable),
    timeframes: TIMEFRAMES.map((tf) => ({
      timeframe: tf,
      level: unlockLevel(tf),
      locked: !isUnlocked(tf, level),
      active: tf === timeframe,
    })),
    quote: quoteAt(inst, cursor),
  };
}

function lockedChips(level: Level, rsAvailable: boolean): LockedChip[] {
  const tools = GATED_TOOLS.filter(
    (tool) => !isUnlocked(tool, level) && (tool !== 'rs' || rsAvailable),
  );
  const nextLevel = Math.min(...tools.map(unlockLevel));
  return tools.map((tool) => ({
    tool,
    label: TOOL_LABELS[tool],
    level: unlockLevel(tool),
    next: unlockLevel(tool) === nextLevel,
  }));
}

function windowBars(inst: InstrumentTimeline, cursor: Cursor, timeframe: Timeframe): ChartBar[] {
  const per = BARS_PER_UNIT[timeframe];
  const series = timeframe === 'W' ? inst.weeks : timeframe === 'D' ? inst.sessions : inst.bars;
  const revealed = cursor + 1;
  const closedCount = Math.floor(revealed / per);
  const hasForming = revealed % per !== 0;
  const closedShown = Math.min(closedCount, WINDOW[timeframe] - (hasForming ? 1 : 0));
  const stageOf = (i: number) => inst.stages[Math.floor((i * per) / BARS_PER_WEEK)] ?? 1;
  const noStudies = { ma10: null, ma30: null, avgVol10: null, rs: null };

  const out: ChartBar[] = [];
  for (let i = closedCount - closedShown; i < closedCount; i++) {
    const bar = series[i];
    if (!bar) continue;
    const studies =
      timeframe === 'W'
        ? {
            ma10: inst.studies.ma10[i] ?? null,
            ma30: inst.studies.ma30[i] ?? null,
            avgVol10: inst.studies.avgVol10[i] ?? null,
            rs: inst.studies.rs[i] ?? null,
          }
        : noStudies;
    out.push({ ...bar, index: i, forming: false, stage: stageOf(i), ...studies });
  }
  if (hasForming) {
    const forming = mergeBars(inst.bars.slice(closedCount * per, revealed));
    out.push({
      ...forming,
      index: closedCount,
      forming: true,
      stage: stageOf(closedCount),
      ...noStudies,
    });
  }
  return out;
}
