import { createContext, useContext } from 'react';
import type { MarketTimeline } from '@investment-tycoon/engine';

/**
 * The run's market timeline, provided once at the top of the app. It lives
 * outside the UI store (ADR-0001): immutable, generated per seed.
 */
export const TimelineContext = createContext<MarketTimeline | null>(null);

export function useTimeline(): MarketTimeline {
  const timeline = useContext(TimelineContext);
  if (!timeline) throw new Error('useTimeline() outside <TimelineContext.Provider>');
  return timeline;
}
