import { create } from 'zustand';
import {
  advanceTo,
  apply,
  type Command,
  type CommandIntent,
  type Cursor,
  isAtEnd,
  type Level,
  type MarketTimeline,
  newRun,
  type RefusalReason,
  nextSessionClose,
  nextWeekClose,
  type RunEvent,
  type RunState,
  runSettingsFor,
  type Shares,
  type Ticker,
  type Timeframe,
} from '@investment-tycoon/engine';
import type { Speed } from '../playback/clock';

/**
 * The UI store (M1 spec "UI store", M2 ADR-0005). The market timeline is NOT
 * here; it is immutable and comes from `useTimeline()`. UI state is speed,
 * pause, the selected ticker, the timeframe, the level and the order size;
 * the run slice holds the engine's run state (which owns the cursor) and its
 * command log. Components read slices with `useUiStore((s) => s.x)`.
 */
export interface UiState {
  speed: Speed;
  paused: boolean;
  instrument: Ticker;
  timeframe: Timeframe;
  level: Level;
  /** The ORDER stepper's value; `null` for the default size. Reset on ticker change. */
  orderShares: Shares | null;
}

/** The run slice: changed only through the engine's reducer. */
export interface RunSlice {
  run: RunState;
  /** Every command dispatched this run, in order (refused ones included). */
  log: Command[];
  /** The last refused command's reason, shown under the order buttons until cleared. */
  refusal: Refusal | null;
}

/** A refusal to show; `id` tells a newer refusal from the one a timer is clearing. */
export interface Refusal {
  id: number;
  reason: RefusalReason;
}

export interface UiActions {
  /** A fresh run for the timeline: start cursor, default stock, W, paused, empty log. */
  startRun(timeline: MarketTimeline, level: Level): void;
  /** Advances the run to `bar` (playback); pauses if that is the end of the market. */
  advanceRun(timeline: MarketTimeline, bar: Cursor): void;
  /** Applies a command at the run's cursor and appends it to the log. */
  dispatch(timeline: MarketTimeline, intent: CommandIntent): RunEvent[];
  /** Clears the refusal message, unless a newer refusal replaced refusal `id`. */
  clearRefusal(id: number): void;
  /** NEXT DAY: jumps to the next session close; pauses if that is the end of the market. */
  nextDay(timeline: MarketTimeline): void;
  /** NEXT WEEK: jumps to the next week close; pauses if that is the end of the market. */
  nextWeek(timeline: MarketTimeline): void;
  /** Plays, optionally at a new speed. */
  play(speed?: Speed): void;
  pause(): void;
  togglePaused(): void;
  setSpeed(speed: Speed): void;
  selectInstrument(ticker: Ticker): void;
  setTimeframe(timeframe: Timeframe): void;
  setOrderShares(shares: Shares | null): void;
}

export type UiStore = UiState & RunSlice & UiActions;

/** Placeholder until `startRun`: an empty run at bar −1. */
const NO_RUN = newRun({ warmupWeeks: 0, runWeeks: 0 }, runSettingsFor(1));

export const useUiStore = create<UiStore>()((set, get) => {
  let refusalId = 0;

  /** Advances the run, pausing playback when it lands on the end of the market. */
  const advance = (timeline: MarketTimeline, bar: Cursor) =>
    set((s) => {
      const run = advanceTo(s.run, timeline, bar).state;
      return { run, paused: s.paused || isAtEnd(timeline, run.cursor) };
    });

  return {
    speed: 1,
    paused: true,
    instrument: '',
    timeframe: 'W',
    level: 1,
    orderShares: null,
    run: NO_RUN,
    log: [],
    refusal: null,

    startRun: (timeline, level) =>
      set({
        run: newRun(timeline, runSettingsFor(level)),
        log: [],
        refusal: null,
        paused: true,
        instrument: timeline.deal.defaultInstrument,
        timeframe: 'W',
        level,
        orderShares: null,
      }),
    advanceRun: advance,
    dispatch: (timeline, intent) => {
      const { run, log } = get();
      const command = { ...intent, at: run.cursor } as Command;
      const step = apply(run, timeline, command);
      const refused = step.events.find((e) => e.type === 'refused');
      set({
        run: step.state,
        log: [...log, command],
        ...(refused && { refusal: { id: ++refusalId, reason: refused.reason } }),
      });
      return step.events;
    },
    clearRefusal: (id) => set((s) => (s.refusal?.id === id ? { refusal: null } : {})),
    nextDay: (timeline) => advance(timeline, nextSessionClose(timeline, get().run.cursor)),
    nextWeek: (timeline) => advance(timeline, nextWeekClose(timeline, get().run.cursor)),
    play: (speed) => set((s) => ({ paused: false, speed: speed ?? s.speed })),
    pause: () => set({ paused: true }),
    togglePaused: () => set((s) => ({ paused: !s.paused })),
    setSpeed: (speed) => set({ speed }),
    selectInstrument: (instrument) =>
      set((s) => (s.instrument === instrument ? {} : { instrument, orderShares: null })),
    setTimeframe: (timeframe) => set({ timeframe }),
    setOrderShares: (orderShares) => set({ orderShares }),
  };
});
