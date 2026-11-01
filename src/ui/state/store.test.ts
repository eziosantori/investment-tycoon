import { beforeEach, describe, expect, it } from 'vitest';
import { generateMarketTimeline, replay, runSettingsFor } from '@investment-tycoon/engine';
import { useUiStore } from './store';

// 160 warm-up + 10 run weeks of 30 bars: the run starts at bar 4799, ends at bar 5099.
const timeline = generateMarketTimeline(48213);
const store = () => useUiStore.getState();
const cursor = () => store().run.cursor;

describe('UI store playback actions', () => {
  beforeEach(() => {
    store().startRun(timeline, 1);
  });

  it('starts the run at the start cursor, paused', () => {
    expect(cursor()).toBe(4799);
    expect(store().paused).toBe(true);
    expect(store().log).toEqual([]);
  });

  it('NEXT DAY jumps to the next session close', () => {
    store().nextDay(timeline);
    expect(cursor()).toBe(4805);
    store().nextDay(timeline);
    expect(cursor()).toBe(4811);
  });

  it('NEXT WEEK jumps to the next week close', () => {
    store().nextWeek(timeline);
    expect(cursor()).toBe(4829);
    store().advanceRun(timeline, 4835);
    store().nextWeek(timeline);
    expect(cursor()).toBe(4859);
  });

  it('keeps playing after a jump, but stops at the end of the market', () => {
    store().play(2);
    store().nextWeek(timeline);
    expect(store().paused).toBe(false);

    store().advanceRun(timeline, 5090);
    store().nextWeek(timeline);
    expect(cursor()).toBe(5099);
    expect(store().paused).toBe(true);
    store().nextDay(timeline);
    expect(cursor()).toBe(5099);
  });
});

describe('UI store run slice', () => {
  beforeEach(() => {
    store().startRun(timeline, 1);
  });

  it('dispatch applies a command at the cursor and appends it to the log', () => {
    store().advanceRun(timeline, 4803);
    const events = store().dispatch(timeline, {
      type: 'marketOrder',
      ticker: 'OMNX',
      side: 'buy',
      shares: 100,
    });
    expect(events[0]).toMatchObject({ type: 'fill', fill: { at: 4803 } });
    expect(store().run.positions.OMNX?.shares).toBe(100);
    expect(store().log).toEqual([
      { type: 'marketOrder', at: 4803, ticker: 'OMNX', side: 'buy', shares: 100 },
    ]);
  });

  it('records refused commands too, so the log replays to the live state', () => {
    store().dispatch(timeline, { type: 'marketOrder', ticker: 'TYX', side: 'buy', shares: 10 });
    store().dispatch(timeline, { type: 'marketOrder', ticker: 'KRVX', side: 'buy', shares: 50 });
    store().advanceRun(timeline, 4840);
    store().dispatch(timeline, { type: 'marketOrder', ticker: 'KRVX', side: 'sell', shares: 50 });
    store().advanceRun(timeline, 4850);
    expect(store().log).toHaveLength(3);
    expect(replay(timeline, runSettingsFor(1), store().log, cursor())).toEqual(store().run);
  });

  it('allows shorting in runs started at Lv7', () => {
    store().startRun(timeline, 7);
    expect(store().run.settings.allowShort).toBe(true);
  });

  it('resets the order size when the selected ticker changes', () => {
    store().setOrderShares(300);
    expect(store().orderShares).toBe(300);
    store().selectInstrument('KRVX');
    expect(store().orderShares).toBeNull();
  });
});
