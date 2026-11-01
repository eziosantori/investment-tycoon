import { splitMoney } from '../../format';
import { useTradingView } from '../../state/tradingView';
import s from './order.module.css';
import { Pnl } from './Pnl';
import t from './trading.module.css';

/** BANKROLL card: equity with the cents dimmed, open P&L with sign and arrow. */
export function Bankroll() {
  const { equity, openPnl } = useTradingView().bankroll;
  const { whole, cents } = splitMoney(equity / 100);

  return (
    <section className={`${t.panel} ${s.bankroll}`} aria-label="Bankroll">
      <span className={t.title}>BANKROLL</span>
      <span className={s.equity}>
        {whole}
        <span className={s.equityCents}>{cents}</span>
      </span>
      <span className={s.open}>
        open <Pnl cents={openPnl} />
      </span>
    </section>
  );
}
