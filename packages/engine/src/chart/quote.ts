import { weekOfBar } from '../market/calendar';
import type { Cents, Cursor, InstrumentTimeline } from '../market/types';

export interface Quote {
  /** Close of the bar at the cursor. */
  last: Cents;
  /** Close of the week before the cursor's week (the reference for the change). */
  prevClose: Cents;
  /** % change of `last` against `prevClose`. */
  changePct: number;
}

/** Last price and weekly change of an instrument at the cursor (toolbar, switcher, side panel). */
export function quoteAt(instrument: InstrumentTimeline, cursor: Cursor): Quote {
  const last = instrument.bars[cursor]?.c ?? 0;
  const prevClose = instrument.weeks[weekOfBar(cursor) - 1]?.c ?? last;
  return { last, prevClose, changePct: prevClose ? ((last - prevClose) / prevClose) * 100 : 0 };
}
