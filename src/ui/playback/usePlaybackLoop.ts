import { useEffect } from 'react';
import { advanceBars, isAtEnd, type MarketTimeline } from '@investment-tycoon/engine';
import { useUiStore } from '../state/store';
import { tickPlayback } from './clock';

/**
 * requestAnimationFrame loop: while playing, accumulates real time × speed and
 * moves the cursor; pauses at the end of the timeline.
 */
export function usePlaybackLoop(timeline: MarketTimeline): void {
  const paused = useUiStore((s) => s.paused);

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    let carryMs = 0;

    const loop = (now: number) => {
      const { cursor, speed, setCursor, pause } = useUiStore.getState();
      const tick = tickPlayback(carryMs, now - last, speed);
      last = now;
      carryMs = tick.carryMs;
      if (tick.bars > 0) {
        const next = advanceBars(timeline, cursor, tick.bars);
        setCursor(next);
        if (isAtEnd(timeline, next)) {
          pause();
          return;
        }
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, timeline]);
}
