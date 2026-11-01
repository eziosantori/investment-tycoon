import { useMemo } from 'react';
import { type MarketTimeline, tradingView, type TradingView } from '@investment-tycoon/engine';
import { type UiStore, useUiStore } from './store';
import { useTimeline } from './timeline';

/** The engine's trading view for the store's run, level, selected ticker and order size. */
export function tradingViewOf(timeline: MarketTimeline, s: UiStore): TradingView {
  return tradingView({
    timeline,
    run: s.run,
    level: s.level,
    ticker: s.instrument,
    orderShares: s.orderShares,
  });
}

/** What the trading panels show, recomputed when the run or a selection changes. */
export function useTradingView(): TradingView {
  const timeline = useTimeline();
  const run = useUiStore((s) => s.run);
  const level = useUiStore((s) => s.level);
  const ticker = useUiStore((s) => s.instrument);
  const orderShares = useUiStore((s) => s.orderShares);
  return useMemo(
    () => tradingView({ timeline, run, level, ticker, orderShares }),
    [timeline, run, level, ticker, orderShares],
  );
}
