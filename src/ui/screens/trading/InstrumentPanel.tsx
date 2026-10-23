import { useMemo } from 'react';
import { watchlist } from '../../../engine/chart/watchlist';
import { arrow, price, signedPct } from '../../format';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import sw from './instrument.module.css';
import s from './trading.module.css';

/**
 * Side panel (in place of the loadout in M1): the selected instrument's last
 * price and its change on the previous week's close, following the cursor.
 */
export function InstrumentPanel() {
  const timeline = useTimeline();
  const cursor = useUiStore((st) => st.cursor);
  const instrument = useUiStore((st) => st.instrument);
  const row = useMemo(
    () => watchlist(timeline, cursor, instrument).find((r) => r.selected),
    [timeline, cursor, instrument],
  );
  if (!row) return null;
  const { last, prevClose, changePct: chg } = row.quote;
  const tone = chg >= 0 ? s.up : s.down;

  return (
    <section className={`${s.panel} ${sw.panel}`} aria-label={`${row.ticker} quote`}>
      <span className={s.title}>INSTRUMENT</span>
      <div className={sw.panelHead}>
        <span className={sw.panelTicker}>{row.ticker}</span>
        <span className={sw.panelKind}>{row.kind === 'index' ? 'INDEX' : 'STOCK'}</span>
      </div>
      <span className={sw.panelName}>{row.name}</span>
      <div className={sw.panelStat}>
        <span className={sw.panelLabel}>LAST</span>
        <span className={sw.panelLast}>{price(last / 100)}</span>
      </div>
      <div className={sw.panelStat}>
        <span className={sw.panelLabel}>WEEK CHANGE</span>
        <span className={`${sw.panelChg} ${tone}`}>
          {signedPct(chg, 2)} {arrow(chg)}
        </span>
      </div>
      <div className={sw.panelStat}>
        <span className={sw.panelLabel}>PREV WEEK CLOSE</span>
        <span className={sw.panelPrev}>{price(prevClose / 100)}</span>
      </div>
    </section>
  );
}
