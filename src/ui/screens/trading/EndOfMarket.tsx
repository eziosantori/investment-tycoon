import { isAtEnd } from '@investment-tycoon/engine';
import { startNewSeed } from '../../../game/seed';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import s from './trading.module.css';

/** Shown once the cursor reaches the end of the run weeks: playback has stopped. */
export function EndOfMarket() {
  const timeline = useTimeline();
  const ended = useUiStore((st) => isAtEnd(timeline, st.cursor));
  if (!ended) return null;

  return (
    <div className={s.endOfMarket} role="status">
      <span className={s.endOfMarketText}>END OF MARKET</span>
      <button type="button" className={s.endOfMarketBtn} onClick={startNewSeed} autoFocus>
        NEW SEED ▸
      </button>
    </div>
  );
}
