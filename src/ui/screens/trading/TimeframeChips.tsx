import type { Timeframe, TimeframeChip } from '@investment-tycoon/engine';
import { LockChip } from './LockChip';
import s from './trading.module.css';

interface Props {
  chips: TimeframeChip[];
  onSelect(timeframe: Timeframe): void;
}

/** W / D / 65m chips; locked timeframes show as dashed "Lv N" chips. */
export function TimeframeChips({ chips, onSelect }: Props) {
  return (
    <div className={s.chips} role="group" aria-label="Timeframe">
      {chips.map((tf) =>
        tf.locked ? (
          <LockChip
            key={tf.timeframe}
            label={tf.label}
            level={tf.level}
            isNextUnlock={tf.isNextUnlock}
          />
        ) : (
          <button
            key={tf.timeframe}
            type="button"
            className={`${s.chip} ${tf.active ? s.chipActive : ''}`}
            aria-pressed={tf.active}
            onClick={() => onSelect(tf.timeframe)}
          >
            {tf.label}
          </button>
        ),
      )}
    </div>
  );
}
