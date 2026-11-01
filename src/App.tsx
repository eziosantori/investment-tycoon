import { useLayoutEffect, useMemo, type ReactNode } from 'react';
import { generateMarketTimeline, type Level } from '@investment-tycoon/engine';
import { TradingScreen } from './ui/screens/trading/TradingScreen';
import { useUiStore } from './ui/state/store';
import { TimelineContext } from './ui/state/timeline';

export interface AppOptions {
  seed: number;
  level: Level;
  /** Extra UI that needs the timeline, e.g. the dev overlay. */
  children?: ReactNode;
}

export function App({ seed, level, children }: AppOptions) {
  // The timeline is generated once per seed and kept outside the UI store.
  const timeline = useMemo(() => generateMarketTimeline(seed), [seed]);

  // The level fixes the run's settings (shorting from Lv7), so a new level starts a new run.
  useLayoutEffect(() => {
    useUiStore.getState().startRun(timeline, level);
  }, [timeline, level]);

  return (
    <TimelineContext.Provider value={timeline}>
      <TradingScreen />
      {children}
    </TimelineContext.Provider>
  );
}
