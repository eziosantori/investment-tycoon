import { create } from 'zustand';
import {
  type Cursor,
  isAtEnd,
  type Level,
  type MarketTimeline,
  nextSessionClose,
  nextWeekClose,
  startCursor,
  type Ticker,
  type Timeframe,
} from '@investment-tycoon/engine';
import type { Speed } from '../playback/clock';

/**
 * The UI store: UI state only (M1 spec, "UI store"). The market timeline is
 * NOT here; it is immutable and comes from `useTimeline()`. Components read
 * slices with `useUiStore((s) => s.x)` and turn them into a chart with the
 * engine's `chartView`.
 */
export interface UiState {
  cursor: Cursor;
  speed: Speed;
  paused: boolean;
  instrument: Ticker;
  timeframe: Timeframe;
  level: Level;
}

export interface UiActions {
  /** Resets playback for a freshly generated timeline: start cursor, default stock, W, paused. */
  startRun(timeline: MarketTimeline): void;
  setCursor(cursor: Cursor): void;
  /** NEXT DAY: jumps to the next session close; pauses if that is the end of the market. */
  nextDay(timeline: Span): void;
  /** NEXT WEEK: jumps to the next week close; pauses if that is the end of the market. */
  nextWeek(timeline: Span): void;
  /** Plays, optionally at a new speed. */
  play(speed?: Speed): void;
  pause(): void;
  togglePaused(): void;
  setSpeed(speed: Speed): void;
  selectInstrument(ticker: Ticker): void;
  setTimeframe(timeframe: Timeframe): void;
  setLevel(level: Level): void;
}

export type UiStore = UiState & UiActions;

type Span = Pick<MarketTimeline, 'warmupWeeks' | 'runWeeks'>;

/** Moves the cursor, pausing playback when it lands on the end of the market. */
function jumpTo(timeline: Span, cursor: Cursor, paused: boolean): Partial<UiState> {
  return { cursor, paused: paused || isAtEnd(timeline, cursor) };
}

export const useUiStore = create<UiStore>()((set) => ({
  cursor: 0,
  speed: 1,
  paused: true,
  instrument: '',
  timeframe: 'W',
  level: 1,

  startRun: (timeline) =>
    set({
      cursor: startCursor(timeline),
      paused: true,
      instrument: timeline.deal.defaultInstrument,
      timeframe: 'W',
    }),
  setCursor: (cursor) => set({ cursor }),
  nextDay: (timeline) =>
    set((s) => jumpTo(timeline, nextSessionClose(timeline, s.cursor), s.paused)),
  nextWeek: (timeline) => set((s) => jumpTo(timeline, nextWeekClose(timeline, s.cursor), s.paused)),
  play: (speed) => set((s) => ({ paused: false, speed: speed ?? s.speed })),
  pause: () => set({ paused: true }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  setSpeed: (speed) => set({ speed }),
  selectInstrument: (instrument) => set({ instrument }),
  setTimeframe: (timeframe) => set({ timeframe }),
  setLevel: (level) => set({ level }),
}));
