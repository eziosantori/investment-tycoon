import type { TimeframeChip } from '../../../engine/chart/view';
import type { Timeframe } from '../../../engine/market/types';
import s from './trading.module.css';

interface Props {
  chips: TimeframeChip[];
  level: number;
  onSelect(timeframe: Timeframe): void;
}

/** W / D / 65m chips; locked timeframes show as dashed "Lv N" chips. */
export function TimeframeChips({ chips, level, onSelect }: Props) {
  return (
    <div className={s.chips} role="group" aria-label="Timeframe">
      {chips.map((tf) =>
        tf.locked ? (
          <button
            key={tf.timeframe}
            type="button"
            disabled
            className={`${s.tfLocked} ${tf.level === level + 1 ? s.tfLockedNext : ''}`}
            title={`Unlocks at level ${tf.level}`}
          >
            <Padlock />
            {tf.timeframe} · Lv{tf.level}
          </button>
        ) : (
          <button
            key={tf.timeframe}
            type="button"
            className={`${s.chip} ${tf.active ? s.chipActive : ''}`}
            aria-pressed={tf.active}
            onClick={() => onSelect(tf.timeframe)}
          >
            {tf.timeframe}
          </button>
        ),
      )}
    </div>
  );
}

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
