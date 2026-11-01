import { useEffect } from 'react';
import type { OrderButton } from '@investment-tycoon/engine';
import { money } from '../../format';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import { useTradingView } from '../../state/tradingView';
import s from './order.module.css';
import { REFUSAL_MS, refusalText } from './refusal';
import t from './trading.module.css';

/** The buttons drawn in the primary style; the rest are secondary. */
const PRIMARY: ReadonlySet<OrderButton['id']> = new Set(['buy', 'cover']);

/**
 * ORDER panel (Lv1–6: BUY n [B], SELL ALL [S] when long; Lv7+: BUY / COVER n
 * [B], SELL / SHORT n [S], FLATTEN [F]). Layout only: sizes,
 * labels and which buttons show come from the engine's trading view.
 */
export function OrderPanel() {
  const timeline = useTimeline();
  const order = useTradingView().order;
  const setOrderShares = useUiStore((st) => st.setOrderShares);
  const dispatch = useUiStore((st) => st.dispatch);
  const refusal = useUiStore((st) => st.refusal);
  const clearRefusal = useUiStore((st) => st.clearRefusal);
  useEffect(() => {
    if (!refusal) return;
    const timer = setTimeout(() => clearRefusal(refusal.id), REFUSAL_MS);
    return () => clearTimeout(timer);
  }, [refusal, clearRefusal]);
  if (!order) return null;

  // An engine refusal shows for a few seconds; otherwise a disabled button's reason.
  const disabled = order.buttons.find((b) => b.disabledReason !== null)?.disabledReason;
  const reason = refusal?.reason ?? disabled ?? null;

  const step = (by: number) => setOrderShares(Math.max(order.step, order.shares + by));
  const press = (b: OrderButton) => dispatch(timeline, b.intent);

  return (
    <section className={`${t.panel} ${s.panel}`} aria-label="Order">
      <span className={t.title}>ORDER</span>
      <div className={s.stepper}>
        <button
          type="button"
          className={s.stepBtn}
          onClick={() => step(-order.step)}
          disabled={order.shares <= order.step}
          aria-label={`${order.step} shares less`}
        >
          −
        </button>
        <span className={s.shares}>
          {order.shares} <span className={s.sharesUnit}>sh</span>
        </span>
        <button
          type="button"
          className={s.stepBtn}
          onClick={() => step(order.step)}
          disabled={order.shares >= order.maxShares}
          aria-label={`${order.step} shares more`}
        >
          +
        </button>
      </div>
      <span className={s.cost}>
        Cost ≈ {money(order.cost / 100)} · {order.costPctOfAccount.toFixed(1)}% of account
      </span>
      <div className={s.buttons}>
        {order.buttons.map((b) => (
          <button
            key={b.id}
            type="button"
            className={PRIMARY.has(b.id) ? s.buy : s.secondary}
            onClick={() => press(b)}
            disabled={b.disabledReason !== null}
            title={b.disabledReason ? refusalText(b.disabledReason) : undefined}
          >
            {b.label}
            <kbd className={s.keycap}>{b.key}</kbd>
          </button>
        ))}
      </div>
      <p className={s.refusal} role="status" aria-live="polite">
        {reason && refusalText(reason)}
      </p>
    </section>
  );
}
