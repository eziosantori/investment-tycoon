import { useEffect } from 'react';
import { isAtEnd } from '../../engine/cursor';
import type { MarketTimeline } from '../../engine/market/types';
import { useUiStore } from '../state/store';
import { shortcutFor } from './shortcuts';

/** Window key listener for the playback shortcuts (Space, 1/2/5); see `shortcutFor`. */
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
      e.preventDefault();
      const store = useUiStore.getState();
      if (shortcut.type === 'speed') {
        store.setSpeed(shortcut.speed);
        if (!isAtEnd(timeline, store.cursor)) store.play(shortcut.speed);
      } else if (!store.paused || !isAtEnd(timeline, store.cursor)) {
        store.togglePaused();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timeline]);
}
