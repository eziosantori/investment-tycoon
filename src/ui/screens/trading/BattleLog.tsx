import type { BattleLogRow } from '@investment-tycoon/engine';
import { duration, price } from '../../format';
import { useUiStore } from '../../state/store';
import { useTradingView } from '../../state/tradingView';
import b from './battleLog.module.css';
import { Pnl, SideLabel } from './Pnl';
import t from './trading.module.css';

/**
 * BATTLE LOG (design/README.md, "Battle log on the Rookie artboard"): open
 * trades first as live rows, then closed ones, most recently closed first, and a total row
 * with the run's realized P&L. Clicking a row selects its ticker.
 */
export function BattleLog() {
  const { rows, totalRealized } = useTradingView().battleLog;
  const instrument = useUiStore((s) => s.instrument);
  const selectInstrument = useUiStore((s) => s.selectInstrument);

  return (
    <section className={`${t.panel} ${b.log}`} aria-label="Battle log">
      <div className={b.header}>
        <span className={t.title}>BATTLE LOG</span>
      </div>
      <div className={b.rows}>
        {rows.length === 0 && <div className={b.empty}>No trades yet</div>}
        {rows.map((row) => (
          <Row
            key={row.tradeId}
            row={row}
            selected={row.ticker === instrument}
            onSelect={() => selectInstrument(row.ticker)}
          />
        ))}
      </div>
      <div className={b.total}>
        <span>TOTAL REALIZED</span>
        <Pnl cents={totalRealized} />
      </div>
    </section>
  );
}

function Row({
  row,
  selected,
  onSelect,
}: {
  row: BattleLogRow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`${b.row} ${selected ? b.rowSelected : ''}`}
      onClick={onSelect}
      aria-label={`Trade ${row.tradeId}, ${row.ticker}${row.live ? ', live' : ''}`}
    >
      <span className={b.id}>#{row.tradeId}</span>
      <span className={b.ticker}>{row.ticker}</span>
      <SideLabel side={row.side} />
      <span className={b.num}>{row.shares}</span>
      <span className={b.prices}>
        {price(row.avgEntry / 100)} →{' '}
        {row.avgExit === null ? <span className={b.live}>live</span> : price(row.avgExit / 100)}
      </span>
      <Pnl className={b.pnl} cents={row.pnl} decimals={0} pct={row.pnlPct} />
      <span className={b.num}>{duration(row.duration, 'compact')}</span>
    </button>
  );
}
