import { parseLevel, type Level } from '../engine/chart/tools';

/** Level from `?level=` (1–8), default 1. Not written back: a missing level stays Lv1 on reload. */
export function levelFromUrl(): Level {
  return parseLevel(new URLSearchParams(window.location.search).get('level')) ?? 1;
}
