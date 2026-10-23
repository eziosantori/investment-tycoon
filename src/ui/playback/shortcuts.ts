import type { Speed } from './clock';

/** The parts of a KeyboardEvent the shortcuts look at (plain data, so it's testable). */
export interface KeyInput {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  repeat?: boolean;
  target?: { tagName?: string; isContentEditable?: boolean } | null;
}

export type Shortcut = { type: 'togglePaused' } | { type: 'speed'; speed: Speed };

const SPEED_KEYS: Readonly<Record<string, Speed>> = { '1': 1, '2': 2, '5': 5 };
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(target: KeyInput['target']): boolean {
  if (!target) return false;
  return target.isContentEditable === true || TYPING_TAGS.has(target.tagName ?? '');
}

/**
 * Playback keys (handoff "Interactions"): Space pauses/plays, 1/2/5 play at
 * that speed. Nothing fires while typing in a field or with a modifier held.
 */
export function shortcutFor(e: KeyInput): Shortcut | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return null;
  if (e.key === ' ') return { type: 'togglePaused' };
  const speed = SPEED_KEYS[e.key];
  return speed ? { type: 'speed', speed } : null;
}
