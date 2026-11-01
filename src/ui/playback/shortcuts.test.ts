import { describe, expect, it } from 'vitest';
import {
  apply,
  generateMarketTimeline,
  newRun,
  runSettingsFor,
  tradingView,
  type Level,
  type OrderButton,
} from '@investment-tycoon/engine';
import { orderButtonFor, shortcutFor } from './shortcuts';

const key = (k: string, extra: Partial<Parameters<typeof shortcutFor>[0]> = {}) =>
  shortcutFor({ key: k, ...extra });

describe('shortcutFor', () => {
  it('maps Space to pause/play and 1/2/5 to speeds', () => {
    expect(key(' ')).toEqual({ type: 'togglePaused' });
    expect(key('1')).toEqual({ type: 'speed', speed: 1 });
    expect(key('2')).toEqual({ type: 'speed', speed: 2 });
    expect(key('5')).toEqual({ type: 'speed', speed: 5 });
  });

  it('ignores other keys', () => {
    expect(key('3')).toBeNull();
    expect(key('a')).toBeNull();
  });

  it("doesn't fire while typing in a field", () => {
    expect(key(' ', { target: { tagName: 'INPUT' } })).toBeNull();
    expect(key('1', { target: { tagName: 'TEXTAREA' } })).toBeNull();
    expect(key('2', { target: { tagName: 'SELECT' } })).toBeNull();
    expect(key('5', { target: { tagName: 'DIV', isContentEditable: true } })).toBeNull();
    expect(key(' ', { target: { tagName: 'DIV' } })).toEqual({ type: 'togglePaused' });
  });

  it("doesn't steal browser shortcuts or key repeats", () => {
    expect(key('1', { ctrlKey: true })).toBeNull();
    expect(key('2', { metaKey: true })).toBeNull();
    expect(key('5', { altKey: true })).toBeNull();
    expect(key(' ', { repeat: true })).toBeNull();
    expect(key('b', { ctrlKey: true })).toBeNull();
  });
});

describe('order keys', () => {
  const button = (id: OrderButton['id'], k: OrderButton['key'], disabled = false): OrderButton => ({
    id,
    key: k,
    label: id,
    intent: { type: 'flatten', ticker: 'OMNX' },
    disabledReason: disabled ? 'insufficientBuyingPower' : null,
  });

  it('maps B, S and F (either case) to the order button with that keycap', () => {
    expect(key('b')).toEqual({ type: 'order', key: 'B' });
    expect(key('S')).toEqual({ type: 'order', key: 'S' });
    expect(key('f')).toEqual({ type: 'order', key: 'F' });
  });

  it('is ignored while typing in a field', () => {
    expect(key('b', { target: { tagName: 'INPUT' } })).toBeNull();
    expect(key('s', { target: { tagName: 'DIV', isContentEditable: true } })).toBeNull();
  });

  it('triggers the visible button with the same keycap, and nothing when it is not shown', () => {
    const flat = [button('buy', 'B')];
    const long = [button('buy', 'B'), button('sellAll', 'S')];
    expect(orderButtonFor(flat, 'B')?.id).toBe('buy');
    expect(orderButtonFor(flat, 'S')).toBeNull();
    expect(orderButtonFor(long, 'S')?.id).toBe('sellAll');
    expect(orderButtonFor(null, 'B')).toBeNull();
  });

  it('does nothing when the button is disabled', () => {
    expect(orderButtonFor([button('buy', 'B', true)], 'B')).toBeNull();
  });

  describe('against the trading view', () => {
    const timeline = generateMarketTimeline(48213);
    const longAt = (level: Level) => {
      const run = newRun(timeline, runSettingsFor(level));
      const at = run.cursor;
      return apply(run, timeline, {
        type: 'marketOrder',
        at,
        ticker: 'OMNX',
        side: 'buy',
        shares: 100,
      }).state;
    };
    const buttonsAt = (level: Level) =>
      tradingView({ timeline, run: longAt(level), level, ticker: 'OMNX', orderShares: null }).order!
        .buttons;

    it('F flattens the selected ticker at Lv7+', () => {
      expect(orderButtonFor(buttonsAt(7), 'F')?.intent).toEqual({
        type: 'flatten',
        ticker: 'OMNX',
      });
    });

    it('F does nothing at Lv1–6', () => {
      for (const level of [1, 6] as const) expect(orderButtonFor(buttonsAt(level), 'F')).toBeNull();
    });
  });
});
