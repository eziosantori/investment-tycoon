import { describe, expect, it } from 'vitest';
import { LEVELS, parseLevel, toolsForLevel, unlockLevel } from './tools';

describe('parseLevel', () => {
  it('accepts 1 to 8 and rejects anything else', () => {
    expect(parseLevel('1')).toBe(1);
    expect(parseLevel('8')).toBe(8);
    for (const bad of [null, undefined, '', '0', '9', '3.5', 'x', '01']) {
      expect(parseLevel(bad)).toBeNull();
    }
  });
});

describe('toolsForLevel', () => {
  // Expected values straight from the M1 spec's level-gating table.
  it.each([
    [1, { price: 'line', ma30: false, ma10: false, volume: false, rs: false, timeframes: ['W'] }],
    [2, { price: 'line', ma30: true, ma10: false, volume: false, rs: false, timeframes: ['W'] }],
    [3, { price: 'line', ma30: true, ma10: false, volume: false, rs: false, timeframes: ['W'] }],
    [4, { price: 'candles', ma30: true, ma10: false, volume: false, rs: false, timeframes: ['W'] }],
    [5, { price: 'candles', ma30: true, ma10: false, volume: true, rs: false, timeframes: ['W'] }],
    [6, { price: 'candles', ma30: true, ma10: true, volume: true, rs: true, timeframes: ['W'] }],
    [
      7,
      { price: 'candles', ma30: true, ma10: true, volume: true, rs: true, timeframes: ['W', 'D'] },
    ],
    [
      8,
      {
        price: 'candles',
        ma30: true,
        ma10: true,
        volume: true,
        rs: true,
        timeframes: ['W', 'D', '65m'],
      },
    ],
  ] as const)('level %i', (level, expected) => {
    expect(toolsForLevel(level)).toEqual(expected);
  });

  it('covers exactly the levels 1 to 8', () => {
    expect(LEVELS).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('unlockLevel', () => {
  it('gives the level each tool unlocks at', () => {
    expect(unlockLevel('ma30')).toBe(2);
    expect(unlockLevel('candles')).toBe(4);
    expect(unlockLevel('volume')).toBe(5);
    expect(unlockLevel('ma10')).toBe(6);
    expect(unlockLevel('rs')).toBe(6);
    expect(unlockLevel('W')).toBe(1);
    expect(unlockLevel('D')).toBe(7);
    expect(unlockLevel('65m')).toBe(8);
  });
});
