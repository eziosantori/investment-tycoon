import { useState } from 'react';
import type { Stage } from '../../../engine/market/types';
import type { DemoScenario } from '../../../game/demoScenario';
import { MINUS, arrow, money, price, rMultiple } from '../../format';
import s from './trading.module.css';

const STAGES: { stage: Stage; label: string; glyph: string }[] = [
  { stage: 1, label: '1 BASE', glyph: '1,8 8,10 15,7 22,9 29,7' },
  { stage: 2, label: '2 ADVANCE', glyph: '1,13 9,10 15,11 22,5 29,1' },
  { stage: 3, label: '3 TOP', glyph: '1,12 8,4 15,2 22,4 29,11' },
  { stage: 4, label: '4 DECLINE', glyph: '1,1 8,5 15,4 22,10 29,13' },
];

const RISK_STEPS = [0.5, 1, 1.5, 2, 2.5];
const ACCOUNT_LIMIT_PCT = 10;
const TRADING_COMING = 'Trading arrives in M2';

function StageCall({ scenario }: { scenario: DemoScenario }) {
  const [call, setCall] = useState<Stage | null>(2);
  const passed = scenario.checks.filter((c) => c.ok).length;
  return (
    <section className={`${s.panel} ${s.box}`} aria-label="Call the stage">
      <div className={s.rowBetween}>
        <span className={s.title}>CALL THE STAGE</span>
        <span className={s.hint}>right call +30 XP</span>
      </div>
      <div className={s.stageCards} role="radiogroup" aria-label="Stage">
        {STAGES.map((st) => (
          <button
            key={st.stage}
            role="radio"
            aria-checked={call === st.stage}
            className={`${s.stageCard} ${call === st.stage ? s.stageCardSelected : ''}`}
            onClick={() => setCall(st.stage)}
          >
            <svg width="30" height="14" viewBox="0 0 30 14" aria-hidden>
              <polyline points={st.glyph} fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>{st.label}</span>
          </button>
        ))}
      </div>
      <div className={s.setup}>
        <span className={s.setupLabel}>SETUP</span>
        <div className={s.stars} aria-label={`Setup rating ${passed} of 4`}>
          {scenario.checks.map((c, i) => (
            <span key={c.label} className={i < passed ? s.starOn : undefined}>
              ★
            </span>
          ))}
        </div>
        <div className={s.spacer} />
        <span className={`${s.mono} ${s.dim}`} style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {passed} / 4
        </span>
      </div>
      <div className={s.checks}>
        {scenario.checks.map((c) => (
          <span key={c.label} className={`${s.check} ${c.ok ? '' : s.checkFail}`}>
            <b>{c.ok ? '✓' : '✕'}</b>
            {c.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function LoadoutPanel({ scenario, noStop }: { scenario: DemoScenario; noStop: boolean }) {
  const p = scenario.position;
  // Each HP point on the account bar is 1/100 of the total loss limit.
  const hpCost = Math.round((p.riskIfStopped / scenario.equity) * 100 * (100 / ACCOUNT_LIMIT_PCT));
  return (
    <section className={`${s.panel} ${s.loadout}`} aria-label="Loadout">
      <div className={s.rowBetween}>
        <span className={s.title}>LOADOUT</span>
        <div className={s.segmented}>
          <span className={s.segBuy}>BUY</span>
          <span>SHORT</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className={s.rowBetween} style={{ fontSize: 11 }}>
          <span className={s.label}>Risk per trade</span>
          <b>
            {p.riskPct.toFixed(1)}% · {money(p.riskBudget)}
          </b>
        </div>
        <div className={s.riskMeter}>
          {RISK_STEPS.map((step) => (
            <div key={step} className={`${s.riskSeg} ${step <= p.riskPct ? s.riskSegOn : ''}`} />
          ))}
        </div>
        <div className={s.riskScale}>
          {RISK_STEPS.map((step, i) => (
            <span key={step}>
              {step.toFixed(1)}
              {i === RISK_STEPS.length - 1 ? '%' : ''}
            </span>
          ))}
        </div>
      </div>
      <div className={s.tiles}>
        {noStop ? (
          <div className={`${s.tile} ${s.tileNone}`}>
            <span className={s.label} style={{ color: 'var(--down-soft)' }}>
              Stop
            </span>
            <b style={{ color: 'var(--risk-3)' }}>NONE</b>
          </div>
        ) : (
          <div className={`${s.tile} ${s.tileStop}`}>
            <span className={s.label}>Stop · {MINUS}1R</span>
            <b className={s.down}>{price(p.stop)}</b>
          </div>
        )}
        <div className={`${s.tile} ${s.tileTarget}`}>
          <span className={s.label}>Target · +2R</span>
          <b className={s.up}>{price(p.target)}</b>
        </div>
      </div>
      <div className={`${s.rowBetween} ${s.size}`}>
        <span className={s.label}>Size</span>
        <span>
          <b>{p.size.toLocaleString('en-US')}</b> <span className={s.label}>sh</span>
        </span>
      </div>
      {noStop ? (
        <div className={s.noShield} role="alert">
          <div className={s.rowBetween}>
            <span className={s.noShieldTitle}>⚠ NO SHIELD</span>
            <span className={s.noShieldHp}>{MINUS}∞ HP</span>
          </div>
          <span className={s.noShieldText}>Without a stop, one bad day can end your run.</span>
        </div>
      ) : (
        <div className={s.ifStopped}>
          <span className={s.label}>If stopped out</span>
          <b>
            {money(-p.riskIfStopped)}{' '}
            <span className={s.hpCost}>
              · {MINUS}
              {hpCost} HP
            </span>
          </b>
        </div>
      )}
    </section>
  );
}

function Actions({ scenario }: { scenario: DemoScenario }) {
  return (
    <div className={s.actions}>
      <button className={s.buy} disabled title={TRADING_COMING}>
        BUY {scenario.position.size.toLocaleString('en-US')} {scenario.ticker}
        <span className={s.buyKey}>B</span>
      </button>
      <div className={s.secondary}>
        <button className={`${s.btn} ${s.btnSell}`} disabled title={TRADING_COMING}>
          SELL <span className={s.keycap}>S</span>
        </button>
        <button className={`${s.btn} ${s.btnFlat}`} disabled title={TRADING_COMING}>
          FLATTEN <span className={s.keycap}>F</span>
        </button>
      </div>
    </div>
  );
}

function ActivePosition({ scenario }: { scenario: DemoScenario }) {
  const p = scenario.position;
  // R track runs from −1R (left edge) to +2R (right edge); entry sits at 1/3.
  const toPct = (r: number) => ((Math.min(2, Math.max(-1, r)) + 1) / 3) * 100;
  const entryPct = toPct(0);
  const nowPct = toPct(p.openR);
  const positive = p.openR >= 0;
  return (
    <section className={s.active} aria-label="Active position">
      <div className={s.rowBetween}>
        <span className={s.activeTitle}>
          ACTIVE · LONG {p.size.toLocaleString('en-US')} {scenario.ticker}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>@ {price(p.entry)}</span>
      </div>
      <div className={`${s.activePnl} ${positive ? s.up : s.down}`}>
        <span>
          {positive ? '+' : MINUS}${Math.abs(Math.round(p.openPnl)).toLocaleString('en-US')}{' '}
          {arrow(p.openPnl)}
        </span>
        <span>{rMultiple(p.openR)}</span>
      </div>
      <div className={s.rTrack}>
        <div className={s.rRisk} style={{ width: `${entryPct}%` }} />
        <div
          className={s.rFill}
          style={{
            left: `${Math.min(entryPct, nowPct)}%`,
            width: `${Math.abs(nowPct - entryPct)}%`,
            background: positive ? 'var(--up)' : 'var(--down)',
            boxShadow: `0 0 8px ${positive ? 'var(--up)' : 'var(--down)'}`,
          }}
        />
        <div className={s.rTick} style={{ left: `${entryPct}%` }} />
        <div className={s.rStar}>★</div>
      </div>
      <div className={s.rLabels}>
        <span>STOP {MINUS}1R</span>
        <span>TARGET +2R</span>
      </div>
    </section>
  );
}

export function Loadout({ scenario, noStop }: { scenario: DemoScenario; noStop: boolean }) {
  return (
    <div className={s.rightCol}>
      <StageCall scenario={scenario} />
      <LoadoutPanel scenario={scenario} noStop={noStop} />
      <Actions scenario={scenario} />
      <div className={s.spacer} />
      <ActivePosition scenario={scenario} />
    </div>
  );
}
