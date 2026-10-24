// M1 demo script at the engine level (the visual part is checked by hand on
// `pnpm build && pnpm preview`): play the run week by week, switch
// W/D/65m and tickers, and compare ?level=1 with ?level=6.
import { describe, expect, it } from 'vitest';
import { chartView } from './chart/view';
import { endCursor, isAtEnd, nextWeekClose, startCursor } from './cursor';
import { generateMarketTimeline } from './market/marketTimeline';

const timeline = generateMarketTimeline(48213);
const instrument = timeline.deal.defaultInstrument;
const tickers = [timeline.index, ...timeline.stocks].map((t) => t.info.ticker);

describe('M1 demo script (seed 48213)', () => {
  it('plays the run to the end one week at a time', () => {
    let cursor = startCursor(timeline);
    let weeks = 0;
    while (!isAtEnd(timeline, cursor)) {
      const next = nextWeekClose(timeline, cursor);
      expect(next).toBeGreaterThan(cursor);
      cursor = next;
      weeks++;
      const v = chartView({ timeline, cursor, instrument, timeframe: 'W', level: 1 });
      expect(v.bars.at(-1)!.c).toBe(v.quote.last);
    }
    expect(cursor).toBe(endCursor(timeline));
    expect(weeks).toBe(timeline.runWeeks);
  });

  it('shows only the price line at level 1 and the full weekly chart at level 6', () => {
    const cursor = startCursor(timeline);
    const lv1 = chartView({ timeline, cursor, instrument, timeframe: 'W', level: 1 });
    expect(lv1.layers).toEqual({
      price: 'line',
      ma30: false,
      ma10: false,
      volume: false,
      rs: false,
    });
    expect(lv1.locked.length).toBeGreaterThan(0);
    const lv6 = chartView({ timeline, cursor, instrument, timeframe: 'W', level: 6 });
    expect(lv6.layers).toEqual({
      price: 'candles',
      ma30: true,
      ma10: true,
      volume: true,
      rs: true,
    });
    expect(lv6.locked).toEqual([]);
  });

  it('switches W, D and 65m on every ticker at level 8, keeping the last price', () => {
    const cursor = nextWeekClose(timeline, startCursor(timeline)) + 7;
    for (const ticker of tickers) {
      const prices = (['W', 'D', '65m'] as const).map((timeframe) => {
        const v = chartView({ timeline, cursor, instrument: ticker, timeframe, level: 8 });
        expect(v.instrument.ticker).toBe(ticker);
        expect(v.timeframe).toBe(timeframe);
        expect(v.bars.length).toBeGreaterThan(0);
        return v.bars.at(-1)!.c;
      });
      expect(new Set(prices).size).toBe(1);
    }
  });
});
