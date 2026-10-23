import type { Level } from '../engine/chart/tools';
import { chartView, type ChartView } from '../engine/chart/view';
import { endCursor } from '../engine/cursor';
import type { MarketTimeline, Stage, Ticker } from '../engine/market/types';

/**
 * Developer tools, available in every build and linked from nowhere:
 * `?dev=1` turns on the dev overlay (hidden-stage bands, level/seed selector,
 * deal readout); `?dev=gallery` opens the stage gallery.
 */
export type DevMode = 'overlay' | 'gallery';

export function devModeFromSearch(search: string): DevMode | null {
  const raw = new URLSearchParams(search).get('dev');
  if (raw === '1') return 'overlay';
  if (raw === 'gallery') return 'gallery';
  return null;
}

/** The query string with `seed` and `level` set, other params kept in place. */
export function withRunParams(search: string, run: { seed: number; level: Level }): string {
  const params = new URLSearchParams(search);
  params.set('seed', String(run.seed));
  params.set('level', String(run.level));
  return `?${params.toString()}`;
}

/** A stock's part in the deal: a setup to find, a trap to avoid, or neither. */
export type DealRole = 'setting up' | 'trap' | 'neutral';

export interface DealReadout {
  index: { ticker: Ticker; stage: Stage };
  /** Every stock, in content order, with its hidden stage at the first run week. */
  stocks: { ticker: Ticker; stage: Stage; role: DealRole }[];
  defaultInstrument: Ticker;
}

/** The run's deal laid out for the dev overlay. */
export function dealReadout(timeline: MarketTimeline): DealReadout {
  const { deal, warmupWeeks } = timeline;
  return {
    index: { ticker: timeline.index.info.ticker, stage: deal.indexStage },
    stocks: timeline.stocks.map((s) => {
      const ticker = s.info.ticker;
      const role: DealRole = deal.settingUp.includes(ticker)
        ? 'setting up'
        : deal.traps.includes(ticker)
          ? 'trap'
          : 'neutral';
      return { ticker, stage: s.stages[warmupWeeks] ?? 1, role };
    }),
    defaultInstrument: deal.defaultInstrument,
  };
}

/**
 * The stage gallery (`?dev=gallery`): the weekly chart of every stock, in
 * content order, at the end of the run, so the whole market can be judged at
 * a glance. Each bar carries its hidden stage for the bands.
 */
export function galleryViews(timeline: MarketTimeline, level: Level): ChartView[] {
  const cursor = endCursor(timeline);
  return timeline.stocks.map((stock) =>
    chartView({ timeline, cursor, instrument: stock.info.ticker, timeframe: 'W', level }),
  );
}
