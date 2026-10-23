import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from './store';

// 160 warm-up + 10 run weeks of 30 bars: the run starts at bar 4799, ends at bar 5099.
const span = { warmupWeeks: 160, runWeeks: 10 };
const store = () => useUiStore.getState();

describe('UI store playback actions', () => {
  beforeEach(() => {
    useUiStore.setState({ cursor: 4799, paused: true, speed: 1 });
  });

  it('NEXT DAY jumps to the next session close', () => {
    store().nextDay(span);
    expect(store().cursor).toBe(4805);
    store().nextDay(span);
    expect(store().cursor).toBe(4811);
  });

  it('NEXT WEEK jumps to the next week close', () => {
    store().nextWeek(span);
    expect(store().cursor).toBe(4829);
    store().setCursor(4835);
    store().nextWeek(span);
    expect(store().cursor).toBe(4859);
  });

  it('keeps playing after a jump, but stops at the end of the market', () => {
    store().play(2);
    store().nextWeek(span);
    expect(store().paused).toBe(false);

    store().setCursor(5090);
    store().nextWeek(span);
    expect(store().cursor).toBe(5099);
    expect(store().paused).toBe(true);
    store().nextDay(span);
    expect(store().cursor).toBe(5099);
  });
});
