import { startNewSeed } from '../../../game/seed';
import { arrow, money, signedMoney } from '../../format';
import { useTradingView } from '../../state/tradingView';
import s from './trading.module.css';

const tone = (pnl: number) => (pnl > 0 ? s.up : pnl < 0 ? s.down : '');

/** P&L in dollars, always with its sign and arrow next to the color. */
function Pnl({ cents }: { cents: number }) {
  return (
    <span className={tone(cents)}>
      {signedMoney(cents / 100)} {arrow(cents)}
    </span>
  );
}

/**
 * Shown once the cursor reaches the end of the run weeks: playback has stopped
 * and every order is refused. Sums up the run; positions still open stay
 * valued at the final mid (no auto-flatten until the Challenge, M4).
 */
export function EndOfMarket() {
  const summary = useTradingView().endSummary;
  if (!summary) return null;
  const { finalEquity, realizedPnl, trades, openPositions } = summary;

  return (
    <div className={s.endOfMarket} role="status">
      <div className={s.endOfMarketHead}>
        <span className={s.endOfMarketText}>END OF MARKET</span>
        <button type="button" className={s.endOfMarketBtn} onClick={startNewSeed} autoFocus>
          NEW SEED ▸
        </button>
      </div>
      <dl className={s.endOfMarketStats}>
        <div>
          <dt>FINAL EQUITY</dt>
          <dd>{money(finalEquity / 100, 2)}</dd>
        </div>
        <div>
          <dt>REALIZED P&amp;L</dt>
          <dd>
            <Pnl cents={realizedPnl} />
          </dd>
        </div>
        <div>
          <dt>TRADES</dt>
          <dd>{trades}</dd>
        </div>
      </dl>
      {openPositions.length > 0 && (
        <div className={s.endOfMarketOpen}>
          <span className={s.endOfMarketLabel}>STILL OPEN · VALUED AT THE MID</span>
          {openPositions.map((p) => (
            <div key={p.ticker} className={s.endOfMarketRow}>
              <span>
                {p.side === 'long' ? '▲ LONG' : '▼ SHORT'} {p.shares} {p.ticker}
              </span>
              <span>@ {money(p.mid / 100, 2)}</span>
              <Pnl cents={p.openPnl} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
