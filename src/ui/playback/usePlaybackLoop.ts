import { useEffect } from 'react';
import { isAtEnd, type MarketTimeline } from '@investment-tycoon/engine';
import { useUiStore } from '../state/store';
import { tickPlayback } from './clock';

/**
 * requestAnimationFrame loop: while playing, accumulates real time × speed and
 * advances the run (ADR-0005); the store pauses at the end of the timeline.
 */
export function usePlaybackLoop(timeline: MarketTimeline): void {
  const paused = useUiStore((s) => s.paused);

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let last = performance.now();
    let carryMs = 0;

    const loop = (now: number) => {
      const { run, speed, advanceRun } = useUiStore.getState();
      const tick = tickPlayback(carryMs, now - last, speed);
      last = now;
      carryMs = tick.carryMs;
      if (tick.bars > 0) {
        advanceRun(timeline, run.cursor + tick.bars);
        if (isAtEnd(timeline, useUiStore.getState().run.cursor)) return;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [paused, timeline]);
}
