import { describe, expect, it } from 'vitest';
import { GALLERY_DEFAULT_LEVEL, levelFromSearch } from './level';

describe('levelFromSearch', () => {
  it('reads ?level=', () => {
    expect(levelFromSearch('?level=4')).toBe(4);
    expect(levelFromSearch('?level=4', GALLERY_DEFAULT_LEVEL)).toBe(4);
  });

  it('defaults to Lv1, or to the given fallback, without a valid level', () => {
    expect(levelFromSearch('')).toBe(1);
    expect(levelFromSearch('?level=9')).toBe(1);
    expect(levelFromSearch('?dev=gallery', GALLERY_DEFAULT_LEVEL)).toBe(6);
  });
});
