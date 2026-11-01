import { useEffect } from 'react';
import { isAtEnd, type MarketTimeline } from '@investment-tycoon/engine';
import { useUiStore } from '../state/store';
import { tradingViewOf } from '../state/tradingView';
import { orderButtonFor, shortcutFor } from './shortcuts';

/** Window key listener for the shortcuts (Space, 1/2/5, B/S/F); see `shortcutFor`. */
export function usePlaybackKeys(timeline: MarketTimeline): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target instanceof HTMLElement ? e.target : null;
      const shortcut = shortcutFor({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        repeat: e.repeat,
        target,
      });
      if (!shortcut) return;
      const store = useUiStore.getState();
      const cursor = store.run.cursor;
      if (shortcut.type === 'order') {
        const button = orderButtonFor(
          tradingViewOf(timeline, store).order?.buttons ?? null,
          shortcut.key,
        );
        if (!button) return;
        e.preventDefault();
        store.dispatch(timeline, button.intent);
        return;
      }
      e.preventDefault();
      if (shortcut.type === 'speed') {
        store.setSpeed(shortcut.speed);
        if (!isAtEnd(timeline, cursor)) store.play(shortcut.speed);
      } else if (!store.paused || !isAtEnd(timeline, cursor)) {
        store.togglePaused();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timeline]);
}
