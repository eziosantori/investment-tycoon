import { duration, price } from '../../format';
import { useTradingView } from '../../state/tradingView';
import s from './order.module.css';
import { Pnl } from './Pnl';
import t from './trading.module.css';

/** HOLDING card for the selected stock; absent when flat. No R progress bar (M3). */
export function HoldingCard() {
  const card = useTradingView().holding;
  if (!card) return null;

  return (
    <section className={`${t.panel} ${s.holding}`} aria-label={card.label}>
      <span className={t.title}>{card.label}</span>
      <span className={s.holdingLine}>
        {card.shares} {card.ticker} @ ${price(card.avgPrice / 100)}
      </span>
      <Pnl className={s.holdingPnl} cents={card.openPnl} pct={card.openPnlPct} />
      <span className={s.holdingHeld}>held {duration(card.held)}</span>
    </section>
  );
}
