import { parseLevel, type Level } from '../engine/chart/tools';

/** The stage gallery opens at Lv6 (full weekly chart) so the stages can be judged. */
export const GALLERY_DEFAULT_LEVEL: Level = 6;

/** Level from a query string's `?level=` (1–8), or `fallback` (default 1) without one. */
export function levelFromSearch(search: string, fallback: Level = 1): Level {
  return parseLevel(new URLSearchParams(search).get('level')) ?? fallback;
}

/** Level from `?level=`. Not written back: a missing level stays the fallback on reload. */
export function levelFromUrl(fallback: Level = 1): Level {
  return levelFromSearch(window.location.search, fallback);
}
