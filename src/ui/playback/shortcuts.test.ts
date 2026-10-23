import { describe, expect, it } from 'vitest';
import { shortcutFor } from './shortcuts';

const key = (k: string, extra: Partial<Parameters<typeof shortcutFor>[0]> = {}) =>
  shortcutFor({ key: k, ...extra });

describe('shortcutFor', () => {
  it('maps Space to pause/play and 1/2/5 to speeds', () => {
    expect(key(' ')).toEqual({ type: 'togglePaused' });
    expect(key('1')).toEqual({ type: 'speed', speed: 1 });
    expect(key('2')).toEqual({ type: 'speed', speed: 2 });
    expect(key('5')).toEqual({ type: 'speed', speed: 5 });
  });

  it('ignores other keys', () => {
    expect(key('3')).toBeNull();
    expect(key('a')).toBeNull();
  });

  it("doesn't fire while typing in a field", () => {
    expect(key(' ', { target: { tagName: 'INPUT' } })).toBeNull();
    expect(key('1', { target: { tagName: 'TEXTAREA' } })).toBeNull();
    expect(key('2', { target: { tagName: 'SELECT' } })).toBeNull();
    expect(key('5', { target: { tagName: 'DIV', isContentEditable: true } })).toBeNull();
    expect(key(' ', { target: { tagName: 'DIV' } })).toEqual({ type: 'togglePaused' });
  });

  it("doesn't steal browser shortcuts or key repeats", () => {
    expect(key('1', { ctrlKey: true })).toBeNull();
    expect(key('2', { metaKey: true })).toBeNull();
    expect(key('5', { altKey: true })).toBeNull();
    expect(key(' ', { repeat: true })).toBeNull();
  });
});
