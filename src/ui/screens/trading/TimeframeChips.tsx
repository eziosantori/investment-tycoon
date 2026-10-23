import type { TimeframeChip } from '../../../engine/chart/view';
import type { Timeframe } from '../../../engine/market/types';
import { LockChip } from './LockChip';
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
          <LockChip
            key={tf.timeframe}
            label={tf.timeframe}
            level={tf.level}
            next={tf.level === level + 1}
          />
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
