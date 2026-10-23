import { useMemo } from 'react';
import { chartView } from '../../../engine/chart/view';
import { StageChart } from '../../components/chart/StageChart';
import { arrow, price, signedPct } from '../../format';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import { LockedChips } from './LockChip';
import { TickerSwitcher } from './TickerSwitcher';
import { TimeframeChips } from './TimeframeChips';
import s from './trading.module.css';

/** The chart card: toolbar (ticker, last price, timeframes) over the chart view. */
export function ChartCard() {
  const timeline = useTimeline();
  const cursor = useUiStore((st) => st.cursor);
  const instrument = useUiStore((st) => st.instrument);
  const timeframe = useUiStore((st) => st.timeframe);
  const level = useUiStore((st) => st.level);
  const setTimeframe = useUiStore((st) => st.setTimeframe);

  const view = useMemo(
    () => chartView({ timeline, cursor, instrument, timeframe, level }),
    [timeline, cursor, instrument, timeframe, level],
  );
  const chg = view.quote.changePct;

  return (
    <section
      className={s.chartCard}
      aria-label={`${view.instrument.ticker} ${view.timeframe} chart`}
    >
      <div className={`${s.corner} ${s.cornerTL}`} />
      <div className={`${s.corner} ${s.cornerTR}`} />
      <div className={`${s.corner} ${s.cornerBL}`} />
      <div className={`${s.corner} ${s.cornerBR}`} />

      <div className={s.toolbar}>
        <TickerSwitcher />
        <span className={s.lastPrice}>
          {price(view.quote.last / 100)}{' '}
          <span className={chg >= 0 ? s.up : s.down}>
            {signedPct(chg, 2)} {arrow(chg)}
          </span>
        </span>
        <TimeframeChips chips={view.timeframes} onSelect={setTimeframe} />
        <div className={s.spacer} />
        <LockedChips chips={view.locked} />
      </div>

      <div className={s.chartBody}>
        <StageChart view={view} />
      </div>
    </section>
  );
}
