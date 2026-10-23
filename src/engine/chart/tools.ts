import type { Timeframe } from '../market/types';

/**
 * Tools-for-level: what the chart shows at each player level (M1 spec, "Level
 * gating"). The single source of truth for line vs candles, overlays, panes and
 * allowed timeframes; the chart view and the locked "Lv N" chips derive from it.
 */

/** The player's rank, 1 to 8. */
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Chart tools that unlock with level: overlays, price style, panes and timeframes. */
export type ChartTool = 'ma30' | 'candles' | 'volume' | 'ma10' | 'rs' | Timeframe;

/** Level at which each tool unlocks. Edit this table to re-balance progression. */
export const TOOL_UNLOCKS: Readonly<Record<ChartTool, Level>> = {
  W: 1,
  ma30: 2,
  candles: 4,
  volume: 5,
  ma10: 6,
  rs: 6,
  D: 7,
  '65m': 8,
};

/** Short labels for the locked "Lv N" chips. */
export const TOOL_LABELS: Readonly<Record<ChartTool, string>> = {
  W: 'W',
  D: 'D',
  '65m': '65m',
  ma30: '30w MA',
  candles: 'CANDLES',
  volume: 'VOL',
  ma10: '10w MA',
  rs: 'RS',
};

/** Timeframes in display order. */
export const TIMEFRAMES: readonly Timeframe[] = ['W', 'D', '65m'];

export interface ChartTools {
  /** Price as a line (Lv1–3) or as candles (Lv4+). */
  price: 'line' | 'candles';
  /** 30-week MA overlay. */
  ma30: boolean;
  /** 10-week MA overlay. */
  ma10: boolean;
  /** Volume pane with the 10-week average volume. */
  volume: boolean;
  /** Mansfield RS pane (still hidden for the index and on D/65m by the chart view). */
  rs: boolean;
  /** Timeframes the player may switch to, in display order. */
  timeframes: Timeframe[];
}

export function unlockLevel(tool: ChartTool): Level {
  return TOOL_UNLOCKS[tool];
}

export function isUnlocked(tool: ChartTool, level: Level): boolean {
  return level >= TOOL_UNLOCKS[tool];
}

export function toolsForLevel(level: Level): ChartTools {
  return {
    price: isUnlocked('candles', level) ? 'candles' : 'line',
    ma30: isUnlocked('ma30', level),
    ma10: isUnlocked('ma10', level),
    volume: isUnlocked('volume', level),
    rs: isUnlocked('rs', level),
    timeframes: TIMEFRAMES.filter((tf) => isUnlocked(tf, level)),
  };
}

/** Parses a level from text (e.g. `?level=`); `null` if it isn't 1–8. */
export function parseLevel(raw: string | null | undefined): Level | null {
  if (raw == null || !/^[1-8]$/.test(raw)) return null;
  return Number(raw) as Level;
}
