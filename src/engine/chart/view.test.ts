import { describe, expect, it } from 'vitest';
import { generateMarketTimeline } from '../market/marketTimeline';
import type { Bar } from '../market/types';
import { chartView, type ChartViewInput } from './view';

// 160 warm-up weeks + 10 run weeks: the run starts at bar 4800 (week 160).
const timeline = generateMarketTimeline(48213);
const stock = timeline.stocks[0]!;
const ticker = stock.info.ticker;
const base: ChartViewInput = {
  timeline,
  cursor: 4799,
  instrument: ticker,
  timeframe: 'W',
  level: 1,
};
const view = (over: Partial<ChartViewInput>) => chartView({ ...base, ...over });
const ohlcv = ({ o, h, l, c, v }: Bar): Bar => ({ o, h, l, c, v });

describe('chartView window', () => {
  it('shows the last 108 closed weeks at the start of the run', () => {
    const v = view({});
    expect(v.bars).toHaveLength(108);
    expect(v.bars.at(-1)).toMatchObject({ index: 159, forming: false, ...stock.weeks[159] });
    expect(v.bars[0]!.index).toBe(52);
  });

  it('ends with the forming week, built from the bars up to the cursor', () => {
    const v = view({ cursor: 4806 });
    expect(v.bars).toHaveLength(108);
    const forming = v.bars.at(-1)!;
    expect(forming).toMatchObject({ index: 160, forming: true });
    const seen = stock.bars.slice(4800, 4807);
    expect(ohlcv(forming)).toEqual({
      o: seen[0]!.o,
      h: Math.max(...seen.map((b) => b.h)),
      l: Math.min(...seen.map((b) => b.l)),
      c: seen[6]!.c,
      v: seen.reduce((s, b) => s + b.v, 0),
    });
  });

  it('uses 120 sessions on D and 120 bars on 65m, ending at the cursor', () => {
    const d = view({ cursor: 4802, timeframe: 'D', level: 8 });
    expect(d.bars).toHaveLength(120);
    expect(d.bars.at(-1)).toMatchObject({ index: 800, forming: true, c: stock.bars[4802]!.c });
    const m = view({ cursor: 4802, timeframe: '65m', level: 8 });
    expect(m.bars).toHaveLength(120);
    expect(m.bars.at(-1)).toMatchObject({ index: 4802, forming: false, ...stock.bars[4802] });
  });

  it('keeps studies still until the week closes', () => {
    const early = view({ cursor: 4800, level: 6 });
    const late = view({ cursor: 4828, level: 6 });
    expect(early.bars.at(-1)).toMatchObject({ ma30: null, ma10: null, rs: null, avgVol10: null });
    expect(late.bars.at(-2)).toEqual(early.bars.at(-2));
    expect(late.bars.at(-2)!.ma30).toBe(stock.studies.ma30[159]);
    const closed = view({ cursor: 4829, level: 6 }).bars.at(-1)!;
    expect(closed).toMatchObject({ index: 160, forming: false, ma30: stock.studies.ma30[160] });
  });

  it('carries the hidden stage of each bar', () => {
    const v = view({ cursor: 4806 });
    expect(v.bars.map((b) => b.stage)).toEqual(stock.stages.slice(53, 161));
  });
});

describe('chartView level gating', () => {
  it('shows only a price line at Lv1, with every other tool as a locked chip', () => {
    const v = view({ level: 1 });
    expect(v.layers).toEqual({ price: 'line', ma30: false, ma10: false, volume: false, rs: false });
    expect(v.locked.map((c) => [c.tool, c.level])).toEqual([
      ['ma30', 2],
      ['candles', 4],
      ['volume', 5],
      ['ma10', 6],
      ['rs', 6],
    ]);
    expect(v.timeframes).toEqual([
      { timeframe: 'W', level: 1, locked: false, active: true },
      { timeframe: 'D', level: 7, locked: true, active: false },
      { timeframe: '65m', level: 8, locked: true, active: false },
    ]);
  });

  it('shows the full chart at Lv6 with nothing locked but the timeframes', () => {
    const v = view({ level: 6 });
    expect(v.layers).toEqual({ price: 'candles', ma30: true, ma10: true, volume: true, rs: true });
    expect(v.locked).toEqual([]);
    expect(v.timeframes.filter((t) => t.locked).map((t) => t.timeframe)).toEqual(['D', '65m']);
  });

  it('has no RS pane, and no RS chip, for the index', () => {
    expect(view({ instrument: 'TYX', level: 6 }).layers.rs).toBe(false);
    expect(view({ instrument: 'TYX', level: 1 }).locked.map((c) => c.tool)).not.toContain('rs');
  });

  it('has no RS pane on D or 65m', () => {
    expect(view({ timeframe: 'D', level: 8 }).layers.rs).toBe(false);
    expect(view({ timeframe: '65m', level: 8 }).layers.rs).toBe(false);
  });

  it('falls back to the weekly chart when the timeframe is locked', () => {
    const v = view({ timeframe: '65m', level: 1 });
    expect(v.timeframe).toBe('W');
    expect(v.bars).toHaveLength(108);
  });
});

describe('chartView quote', () => {
  it('gives the last price at the cursor and the change on the previous week close', () => {
    const v = view({ cursor: 4806 });
    const last = stock.bars[4806]!.c;
    const prev = stock.weeks[159]!.c;
    expect(v.quote.last).toBe(last);
    expect(v.quote.changePct).toBeCloseTo(((last - prev) / prev) * 100, 9);
  });
});

describe('chartView instrument', () => {
  it('describes the selected instrument', () => {
    expect(view({}).instrument).toEqual(stock.info);
    expect(view({ instrument: 'TYX' }).instrument.kind).toBe('index');
  });
});
