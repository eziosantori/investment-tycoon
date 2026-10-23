import { describe, expect, it } from 'vitest';
import { clockLabel } from './clockLabel';

describe('clockLabel', () => {
  it('shows the session day and the start time of the bar', () => {
    expect(clockLabel(0)).toBe('MON · 09:30');
    expect(clockLabel(1)).toBe('MON · 10:35');
    expect(clockLabel(5)).toBe('MON · 14:55');
    expect(clockLabel(6)).toBe('TUE · 09:30');
    // Thursday is session 3 of the week; bar 4 of a session starts at 13:50.
    expect(clockLabel(3 * 6 + 4)).toBe('THU · 13:50');
    expect(clockLabel(29)).toBe('FRI · 14:55');
  });

  it('repeats every week', () => {
    expect(clockLabel(160 * 30 + 22)).toBe('THU · 13:50');
  });
});
