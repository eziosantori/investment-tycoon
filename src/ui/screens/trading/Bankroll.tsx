import { arrow, signedMoney, splitMoney } from '../../format';
import { useTradingView } from '../../state/tradingView';
import s from './order.module.css';
import t from './trading.module.css';

/** BANKROLL card: equity with the cents dimmed, open P&L with sign and arrow. */
export function Bankroll() {
  const { equity, openPnl } = useTradingView().bankroll;
  const { whole, cents } = splitMoney(equity / 100);
  const tone = openPnl > 0 ? t.up : openPnl < 0 ? t.down : '';

  return (
    <section className={`${t.panel} ${s.bankroll}`} aria-label="Bankroll">
      <span className={t.title}>BANKROLL</span>
      <span className={s.equity}>
        {whole}
        <span className={s.equityCents}>{cents}</span>
      </span>
      <span className={s.open}>
        open{' '}
        <span className={tone}>
          {signedMoney(openPnl / 100)} {arrow(openPnl)}
        </span>
      </span>
    </section>
  );
}
