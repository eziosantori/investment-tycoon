import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from '@investment-tycoon/engine';
import { dealReadout, devModeFromSearch, galleryViews, withRunParams } from './dev';

describe('galleryViews', () => {
  const timeline = generateMarketTimeline(48213);

  it('gives one weekly chart per stock, in content order', () => {
    const views = galleryViews(timeline, 4);
    expect(views).toHaveLength(12);
    expect(views.map((v) => v.instrument.ticker)).toEqual(
      timeline.stocks.map((s) => s.info.ticker),
    );
    expect(views.every((v) => v.timeframe === 'W')).toBe(true);
  });

  it('shows the whole run: the last bar is the final week, closed', () => {
    const [first] = galleryViews(timeline, 1);
    const last = first?.bars[first.bars.length - 1];
    expect(last?.index).toBe(timeline.warmupWeeks + timeline.runWeeks - 1);
    expect(last?.forming).toBe(false);
  });

  it('carries the hidden stage of every week, for the bands', () => {
    const [first] = galleryViews(timeline, 1);
    const stages = timeline.stocks[0]?.stages ?? [];
    expect(first?.bars.map((b) => b.stage)).toEqual(first?.bars.map((b) => stages[b.index]));
  });

  it('applies the level gating', () => {
    expect(galleryViews(timeline, 1)[0]?.layers.price).toBe('line');
    expect(galleryViews(timeline, 4)[0]?.layers.price).toBe('candles');
  });
});

describe('devModeFromSearch', () => {
  it('turns the overlay on with ?dev=1', () => {
    expect(devModeFromSearch('?seed=48213&dev=1')).toBe('overlay');
  });

  it('recognises the gallery with ?dev=gallery', () => {
    expect(devModeFromSearch('?dev=gallery')).toBe('gallery');
  });

  it('is off without the flag or with any other value', () => {
    expect(devModeFromSearch('')).toBeNull();
    expect(devModeFromSearch('?seed=48213')).toBeNull();
    expect(devModeFromSearch('?dev=0')).toBeNull();
    expect(devModeFromSearch('?dev=yes')).toBeNull();
  });
});

describe('withRunParams', () => {
  it('writes seed and level, keeping the other params', () => {
    expect(withRunParams('?seed=1&dev=1&cb=1', { seed: 48213, level: 6 })).toBe(
      '?seed=48213&dev=1&cb=1&level=6',
    );
  });

  it('adds seed and level to an empty query', () => {
    expect(withRunParams('', { seed: 7, level: 1 })).toBe('?seed=7&level=1');
  });
});

describe('dealReadout', () => {
  const timeline = generateMarketTimeline(48213);
  const readout = dealReadout(timeline);

  it('lists every stock of the universe once, in content order', () => {
    expect(readout.stocks.map((r) => r.ticker)).toEqual(timeline.stocks.map((s) => s.info.ticker));
  });

  it('labels each stock with its role in the deal', () => {
    for (const row of readout.stocks) {
      const expected = timeline.deal.settingUp.includes(row.ticker)
        ? 'setting up'
        : timeline.deal.traps.includes(row.ticker)
          ? 'trap'
          : 'neutral';
      expect(row.role).toBe(expected);
    }
  });

  it('shows the hidden stage at the first run week, the index stage and the default stock', () => {
    const first = timeline.warmupWeeks;
    readout.stocks.forEach((row, i) => expect(row.stage).toBe(timeline.stocks[i]?.stages[first]));
    expect(readout.index).toEqual({ ticker: 'TYX', stage: timeline.deal.indexStage });
    expect(readout.defaultInstrument).toBe(timeline.deal.defaultInstrument);
  });
});
