import { arrow, price, signedMoney, signedPct } from '../../format';
import { useTradingView } from '../../state/tradingView';
import s from './order.module.css';
import t from './trading.module.css';

/** HOLDING card for the selected stock; absent when flat. No R progress bar (M3). */
export function HoldingCard() {
  const card = useTradingView().holding;
  if (!card) return null;
  const tone = card.openPnl > 0 ? t.up : card.openPnl < 0 ? t.down : '';
  const unit = card.held.unit === 'weeks' ? 'wk' : card.held.value === 1 ? 'session' : 'sessions';

  return (
    <section className={`${t.panel} ${s.holding}`} aria-label={card.label}>
      <span className={t.title}>{card.label}</span>
      <span className={s.holdingLine}>
        {card.shares} {card.ticker} @ ${price(card.avgPrice / 100)}
      </span>
      <span className={`${s.holdingPnl} ${tone}`}>
        {signedMoney(card.openPnl / 100)} {arrow(card.openPnl)} {signedPct(card.openPnlPct)}
      </span>
      <span className={s.holdingHeld}>
        held {card.held.value} {unit}
      </span>
    </section>
  );
}
