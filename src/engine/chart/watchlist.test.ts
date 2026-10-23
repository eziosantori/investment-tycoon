import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from '../market/marketTimeline';
import { watchlist } from './watchlist';

const timeline = generateMarketTimeline(48213);

describe('watchlist', () => {
  it('lists the index first, then the 12 stocks in universe order', () => {
    const rows = watchlist(timeline, 4806, timeline.stocks[0]!.info.ticker);
    expect(rows).toHaveLength(13);
    expect(rows.map((r) => r.ticker)).toEqual([
      'TYX',
      ...timeline.stocks.map((s) => s.info.ticker),
    ]);
    expect(rows[0]!.kind).toBe('index');
  });

  it('quotes each instrument at the cursor against its previous week close', () => {
    const row = watchlist(timeline, 4806, 'TYX')[3]!;
    const stock = timeline.stocks[2]!;
    const last = stock.bars[4806]!.c;
    const prev = stock.weeks[159]!.c;
    expect(row.ticker).toBe(stock.info.ticker);
    expect(row.name).toBe(stock.info.name);
    expect(row.quote.last).toBe(last);
    expect(row.quote.changePct).toBeCloseTo(((last - prev) / prev) * 100, 9);
  });

  it('marks the selected instrument', () => {
    const ticker = timeline.stocks[5]!.info.ticker;
    const rows = watchlist(timeline, 4799, ticker);
    expect(rows.filter((r) => r.selected).map((r) => r.ticker)).toEqual([ticker]);
  });

  it('marks the deal default instrument when the selection is unknown, like the chart', () => {
    const rows = watchlist(timeline, 4799, '');
    expect(rows.filter((r) => r.selected).map((r) => r.ticker)).toEqual([
      timeline.deal.defaultInstrument,
    ]);
  });

  it('moves with the cursor', () => {
    const at = (cursor: number) => watchlist(timeline, cursor, 'TYX')[0]!.quote.last;
    expect(at(4800)).toBe(timeline.index.bars[4800]!.c);
    expect(at(4829)).toBe(timeline.index.bars[4829]!.c);
  });
});
