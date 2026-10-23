import { describe, expect, it } from 'vitest';
import {
  advanceBars,
  clampCursor,
  endCursor,
  isAtEnd,
  nextSessionClose,
  nextWeekClose,
  startCursor,
} from './cursor';
import { generateMarketTimeline } from './market/marketTimeline';

// 160 warm-up weeks + 10 run weeks of 30 bars: bars 0..5099, run starts at bar 4800.
const t = generateMarketTimeline(1);

describe('cursor', () => {
  it('starts on the last warm-up bar and ends on the last run bar', () => {
    expect(startCursor(t)).toBe(4799);
    expect(endCursor(t)).toBe(5099);
  });

  it('advances by n bars, clamped at the end of the timeline', () => {
    expect(advanceBars(t, 4799, 1)).toBe(4800);
    expect(advanceBars(t, 4799, 25)).toBe(4824);
    expect(advanceBars(t, 5090, 25)).toBe(5099);
    expect(advanceBars(t, 5099, 1)).toBe(5099);
  });

  it('jumps to the next session close', () => {
    expect(nextSessionClose(t, 4799)).toBe(4805);
    expect(nextSessionClose(t, 4800)).toBe(4805);
    expect(nextSessionClose(t, 4804)).toBe(4805);
    expect(nextSessionClose(t, 4805)).toBe(4811);
    expect(nextSessionClose(t, 5099)).toBe(5099);
  });

  it('jumps to the next week close', () => {
    expect(nextWeekClose(t, 4799)).toBe(4829);
    expect(nextWeekClose(t, 4812)).toBe(4829);
    expect(nextWeekClose(t, 4829)).toBe(4859);
    expect(nextWeekClose(t, 5080)).toBe(5099);
    expect(nextWeekClose(t, 5099)).toBe(5099);
  });

  it('knows when playback has reached the end', () => {
    expect(isAtEnd(t, 5098)).toBe(false);
    expect(isAtEnd(t, 5099)).toBe(true);
  });

  it('clamps any value into the timeline', () => {
    expect(clampCursor(t, -5)).toBe(0);
    expect(clampCursor(t, 99_999)).toBe(5099);
    expect(clampCursor(t, 4800.7)).toBe(4800);
  });
});
