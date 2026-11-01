import type { OrderButton, OrderKey } from '@investment-tycoon/engine';
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

export type Shortcut =
  { type: 'togglePaused' } | { type: 'speed'; speed: Speed } | { type: 'order'; key: OrderKey };

const SPEED_KEYS: Readonly<Record<string, Speed>> = { '1': 1, '2': 2, '5': 5 };
const ORDER_KEYS: Readonly<Record<string, OrderKey>> = { b: 'B', s: 'S', f: 'F' };
const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isTyping(target: KeyInput['target']): boolean {
  if (!target) return false;
  return target.isContentEditable === true || TYPING_TAGS.has(target.tagName ?? '');
}

/**
 * Keyboard shortcuts (handoff "Interactions"): Space pauses/plays, 1/2/5 play
 * at that speed, B / S / F trigger the order button with that keycap. Nothing
 * fires while typing in a field or with a modifier held.
 */
export function shortcutFor(e: KeyInput): Shortcut | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return null;
  if (e.key === ' ') return { type: 'togglePaused' };
  const speed = SPEED_KEYS[e.key];
  if (speed) return { type: 'speed', speed };
  const order = ORDER_KEYS[e.key.toLowerCase()];
  return order ? { type: 'order', key: order } : null;
}

/**
 * The button an order key triggers: the visible, enabled one with that keycap
 * in the current ORDER panel variant; `null` (do nothing) otherwise.
 */
export function orderButtonFor(
  buttons: readonly OrderButton[] | null,
  key: OrderKey,
): OrderButton | null {
  const button = buttons?.find((b) => b.key === key);
  return button && !button.disabledReason ? button : null;
}
