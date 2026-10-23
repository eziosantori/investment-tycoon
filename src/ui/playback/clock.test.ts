import { describe, expect, it } from 'vitest';
import { tickPlayback } from './clock';

describe('tickPlayback', () => {
  it('moves one bar per second at 1×', () => {
    expect(tickPlayback(0, 999, 1)).toEqual({ bars: 0, carryMs: 999 });
    expect(tickPlayback(999, 1, 1)).toEqual({ bars: 1, carryMs: 0 });
  });

  it('scales with speed', () => {
    expect(tickPlayback(0, 1000, 2)).toEqual({ bars: 2, carryMs: 0 });
    expect(tickPlayback(0, 500, 5)).toEqual({ bars: 2, carryMs: 500 });
  });

  it('ignores huge frame gaps (tab in background) beyond one second', () => {
    expect(tickPlayback(0, 60_000, 1)).toEqual({ bars: 1, carryMs: 0 });
  });
});
