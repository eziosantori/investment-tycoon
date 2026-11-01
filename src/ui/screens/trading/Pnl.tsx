import type { PositionSide } from '@investment-tycoon/engine';
import { arrow, signedMoney, signedPct } from '../../format';
import t from './trading.module.css';

/** The up / down color class for a P&L; none at zero. */
const pnlTone = (cents: number) => (cents > 0 ? t.up : cents < 0 ? t.down : '');

/** P&L in dollars, always with its sign and arrow next to the color; optionally its percent. */
export function Pnl({
  cents,
  decimals = 2,
  pct,
  className = '',
}: {
  cents: number;
  decimals?: number;
  pct?: number;
  className?: string | undefined;
}) {
  return (
    <span className={`${className} ${pnlTone(cents)}`.trim()}>
      {signedMoney(cents / 100, decimals)} {arrow(cents)}
      {pct !== undefined && ` ${signedPct(pct)}`}
    </span>
  );
}

/** ▲ LONG / ▼ SHORT, in the side's color. */
export function SideLabel({ side }: { side: PositionSide }) {
  return side === 'long' ? (
    <span className={t.up}>▲ LONG</span>
  ) : (
    <span className={t.down}>▼ SHORT</span>
  );
}
