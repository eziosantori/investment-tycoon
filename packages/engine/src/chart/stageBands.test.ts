import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { Stage } from '../market/types';
import { stageBands } from './stageBands';
import { chartView } from './view';

describe('stageBands', () => {
  it('groups consecutive bars of the same hidden stage into one band', () => {
    const stages: Stage[] = [1, 1, 1, 2, 2, 3, 4, 4, 1];
    expect(stageBands(stages)).toEqual([
      { stage: 1, from: 0, to: 3 },
      { stage: 2, from: 3, to: 5 },
      { stage: 3, from: 5, to: 6 },
      { stage: 4, from: 6, to: 8 },
      { stage: 1, from: 8, to: 9 },
    ]);
  });

  it('returns no bands for an empty window', () => {
    expect(stageBands([])).toEqual([]);
  });

  it('accepts chart view bars and covers the whole visible window', () => {
    const timeline = generateMarketTimeline(48213);
    const view = chartView({
      timeline,
      cursor: timeline.warmupWeeks * 30 - 1,
      instrument: timeline.deal.defaultInstrument,
      timeframe: 'W',
      level: 1,
    });
    const bands = stageBands(view.bars);
    expect(bands[0]?.from).toBe(0);
    expect(bands.at(-1)?.to).toBe(view.bars.length);
    for (const band of bands) {
      for (let i = band.from; i < band.to; i++) expect(view.bars[i]?.stage).toBe(band.stage);
    }
    bands.slice(1).forEach((band, i) => expect(band.stage).not.toBe(bands[i]?.stage));
  });
});
