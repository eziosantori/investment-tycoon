import type { Level } from '../../../engine/chart/tools';
import type { LockedChip } from '../../../engine/chart/view';
import s from './trading.module.css';

/** Padlock icon of the locked chips (canvas SVG, replaces the 🔒 emoji). */
function Padlock() {
  return (
    <svg width="9" height="10" viewBox="0 0 9 10" aria-hidden="true">
      <rect
        x="1"
        y="4.5"
        width="7"
        height="5"
        rx="1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <path d="M2.5 4.5V3a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** A dashed "LABEL · Lv N" chip for a tool the player hasn't unlocked yet. */
export function LockChip({
  label,
  level,
  isNextUnlock,
}: {
  label: string;
  level: Level;
  isNextUnlock: boolean;
}) {
  return (
    <button
      type="button"
      disabled
      className={`${s.lockedChip} ${isNextUnlock ? s.lockedChipNext : ''}`}
      title={`Unlocks at level ${level}`}
    >
      <Padlock />
      {label} · Lv{level}
    </button>
  );
}

/** The right-hand group of locked overlay/pane chips. */
export function LockedChips({ chips }: { chips: LockedChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className={s.studyChips} role="group" aria-label="Locked tools">
      {chips.map((c) => (
        <LockChip key={c.tool} label={c.label} level={c.level} isNextUnlock={c.isNextUnlock} />
      ))}
    </div>
  );
}
