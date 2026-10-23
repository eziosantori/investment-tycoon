import {
  BAR_MINUTES,
  BARS_PER_SESSION,
  SESSION_OPEN_MINUTES,
  SESSIONS_PER_WEEK,
  sessionOfBar,
} from '../../engine/market/calendar';
import type { Cursor } from '../../engine/market/types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * HUD clock for a 65m bar: the session day and the bar's start time, e.g.
 * "THU · 13:50". Sessions run 09:30 → 16:00 in six bars, Monday to Friday.
 */
export function clockLabel(bar: Cursor): string {
  const day = DAYS[sessionOfBar(bar) % SESSIONS_PER_WEEK];
  const minutes = SESSION_OPEN_MINUTES + (bar % BARS_PER_SESSION) * BAR_MINUTES;
  return `${day} · ${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}
