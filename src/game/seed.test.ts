import { describe, expect, it } from 'vitest';
import { urlWithSeed } from './seed';

describe('urlWithSeed', () => {
  it('swaps the seed and keeps the other params', () => {
    expect(urlWithSeed('http://localhost:5173/?seed=48213&level=6&dev=1', 7)).toBe(
      'http://localhost:5173/?seed=7&level=6&dev=1',
    );
  });

  it('adds the seed when missing', () => {
    expect(urlWithSeed('http://localhost:5173/?level=2', 123)).toBe(
      'http://localhost:5173/?level=2&seed=123',
    );
  });
});
