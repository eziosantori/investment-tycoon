import type { BattleLogRow, Duration } from '@investment-tycoon/engine';
import { arrow, price, signedMoney, signedPct } from '../../format';
import { useUiStore } from '../../state/store';
import { useTradingView } from '../../state/tradingView';
import b from './battleLog.module.css';
import t from './trading.module.css';

const tone = (pnl: number) => (pnl > 0 ? t.up : pnl < 0 ? t.down : '');
const duration = ({ value, unit }: Duration) => `${value}${unit === 'weeks' ? 'w' : 'd'}`;

/**
 * BATTLE LOG (design/README.md, "Battle log on the Rookie artboard"): open
 * trades first as live rows, then closed ones, newest first, and a total row
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
        <span className={tone(totalRealized)}>
          {signedMoney(totalRealized / 100)} {arrow(totalRealized)}
        </span>
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
  const long = row.side === 'long';
  return (
    <button
      type="button"
      className={`${b.row} ${selected ? b.rowSelected : ''}`}
      onClick={onSelect}
      aria-label={`Trade ${row.tradeId}, ${row.ticker}${row.live ? ', live' : ''}`}
    >
      <span className={b.id}>#{row.tradeId}</span>
      <span className={b.ticker}>{row.ticker}</span>
      <span className={long ? t.up : t.down}>{long ? '▲ LONG' : '▼ SHORT'}</span>
      <span className={b.num}>{row.shares}</span>
      <span className={b.prices}>
        {price(row.avgEntry / 100)} →{' '}
        {row.avgExit === null ? <span className={b.live}>live</span> : price(row.avgExit / 100)}
      </span>
      <span className={`${b.pnl} ${tone(row.pnl)}`}>
        {signedMoney(row.pnl / 100, 0)} {signedPct(row.pnlPct)} {arrow(row.pnl)}
      </span>
      <span className={b.num}>{duration(row.duration)}</span>
    </button>
  );
}
