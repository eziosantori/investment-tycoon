import { hpFromLoss, hpState, type HpState } from '../../../game/hp';
import { SegmentBar } from '../../components/SegmentBar';
import { MINUS, signedMoney, signedPct, splitMoney } from '../../format';
import { RUN } from './placeholder';
import s from './trading.module.css';

const HP_COLOR: Record<HpState, string> = {
  safe: 'var(--risk-0)',
  warning: 'var(--risk-1)',
  critical: 'var(--risk-3)',
  breached: 'var(--risk-3)',
};

function HpCard({
  title,
  icon,
  usedPct,
  limitPct,
  caption,
  captionRight,
  emphasize,
}: {
  title: string;
  icon: React.ReactNode;
  usedPct: number;
  limitPct: number;
  caption: string;
  captionRight?: string;
  /** Account HP gets the red-tinted card and pulsing number once it's in danger. */
  emphasize?: boolean;
}) {
  const hp = hpFromLoss(usedPct, limitPct);
  const state = hpState(hp);
  const color = HP_COLOR[state];
  const danger = state !== 'safe';
  return (
    <div
      className={`${s.panel} ${s.statCard} ${emphasize && danger ? s.statCardDanger : ''}`}
      data-hp-state={state}
    >
      <div className={s.statHead}>
        <span className={s.statLabel}>
          {icon}
          {title}
        </span>
        <span className={s.hpValue}>
          <b className={emphasize && danger ? s.pulse : undefined} style={{ color }}>
            {hp}
          </b>
          /100
        </span>
      </div>
      <SegmentBar
        label={`${title} ${hp} of 100`}
        value={hp / 100}
        color={color}
        track="var(--damage)"
        className={emphasize && danger ? s.warnAnim : undefined}
      />
      <div className={s.caption}>
        <span>{caption}</span>
        {captionRight && <span>{captionRight}</span>}
      </div>
    </div>
  );
}

export function StatusRow({ equity, openPnl }: { equity: number; openPnl: number }) {
  const money = splitMoney(equity);
  const fmtLoss = (x: number) => `${MINUS}${x.toFixed(1)}%`;
  return (
    <section className={s.statusRow} aria-label="Challenge status">
      <div className={`${s.panel} ${s.statCard}`}>
        <div className={s.statHead}>
          <span className={s.statLabel}>
            <span className={s.iconDiamond} />
            MISSION · +{RUN.targetPct}%
          </span>
          <span className={`${s.statValue} ${s.up}`}>{signedPct(RUN.progressPct)}</span>
        </div>
        <SegmentBar
          label="Profit target progress"
          value={RUN.progressPct / RUN.targetPct}
          color="var(--up)"
          track="var(--track)"
          glow
          star
        />
        <div className={s.caption}>
          <span>{RUN.toUnlock}</span>
        </div>
      </div>

      <HpCard
        title="DAILY HP"
        icon={<span style={{ color: 'var(--risk-1)', fontSize: 13 }}>♥</span>}
        usedPct={RUN.dailyLossUsedPct}
        limitPct={RUN.dailyLossLimitPct}
        caption={`${fmtLoss(RUN.dailyLossUsedPct)} of ${fmtLoss(RUN.dailyLossLimitPct)} taken today`}
        captionRight="refills at open"
      />
      <HpCard
        title="ACCOUNT HP"
        icon={<span className={s.iconShield} style={{ background: 'var(--risk-1)' }} />}
        usedPct={RUN.totalLossUsedPct}
        limitPct={RUN.totalLossLimitPct}
        caption={`${fmtLoss(RUN.totalLossUsedPct)} of ${fmtLoss(RUN.totalLossLimitPct)} · game over at ${RUN.gameOverAt}`}
        emphasize
      />

      <div className={`${s.panel} ${s.bankroll}`}>
        <span className={s.bankrollLabel}>BANKROLL</span>
        <span className={s.bankrollValue}>
          {money.whole}
          <span className={s.cents}>{money.cents}</span>
        </span>
        <span className={s.openPnl}>
          open{' '}
          <b className={openPnl >= 0 ? s.up : s.down}>
            {signedMoney(openPnl)} {openPnl >= 0 ? '▲' : '▼'}
          </b>
        </span>
        <div className={s.xpToast} aria-hidden>
          {RUN.xpToast}
        </div>
      </div>
    </section>
  );
}
