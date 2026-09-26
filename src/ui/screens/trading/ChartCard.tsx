import { useState } from 'react';
import type { WeeklyStudyBar } from '../../../engine/market/types';
import type { DemoScenario } from '../../../game/demoScenario';
import {
  StageChart,
  type ChartPosition,
  type StudyToggles,
} from '../../components/chart/StageChart';
import { arrow, price, signedPct } from '../../format';
import s from './trading.module.css';

const TIMEFRAMES = [
  { id: 'W', enabled: true },
  { id: 'D', enabled: false },
  { id: '65m', enabled: false },
] as const;

const STUDIES: { id: keyof StudyToggles; label: string }[] = [
  { id: 'ma', label: 'MA' },
  { id: 'vol', label: 'VOL' },
  { id: 'rs', label: 'RS' },
];

interface Props {
  bars: WeeklyStudyBar[];
  scenario: DemoScenario;
  position: ChartPosition;
}

export function ChartCard({ bars, scenario, position }: Props) {
  const [show, setShow] = useState<StudyToggles>({ ma: true, vol: true, rs: true });
  const last = scenario.position.last;
  const chg = scenario.lastChangePct;
  const slope = scenario.ma30SlopePct;

  return (
    <section className={s.chartCard} aria-label={`${scenario.ticker} weekly chart`}>
      <div className={`${s.corner} ${s.cornerTL}`} />
      <div className={`${s.corner} ${s.cornerTR}`} />
      <div className={`${s.corner} ${s.cornerBL}`} />
      <div className={`${s.corner} ${s.cornerBR}`} />

      <div className={s.toolbar}>
        <span className={s.ticker}>{scenario.ticker}</span>
        <span className={s.lastPrice}>
          {price(last)}{' '}
          <span className={chg >= 0 ? s.up : s.down}>
            {signedPct(chg, 2)} {arrow(chg)}
          </span>
        </span>
        <div className={s.chips} role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              className={`${s.chip} ${tf.id === 'W' ? s.chipActive : ''}`}
              disabled={!tf.enabled}
              aria-pressed={tf.id === 'W'}
              title={tf.enabled ? undefined : 'Daily and 65m timeframes arrive in M1'}
            >
              {tf.id}
            </button>
          ))}
        </div>
        {show.ma && (
          <>
            <span className={s.legend}>
              <span className={s.legendSwatch} style={{ height: 2.5, background: 'var(--ma30)' }} />
              30w{' '}
              <span style={{ color: 'var(--text)' }}>
                {scenario.ma30?.toFixed(2)} {slope == null ? '' : slope >= 0 ? '↗' : '↘'}
              </span>
            </span>
            <span className={s.legend}>
              <span
                className={s.legendSwatch}
                style={{ height: 1.5, background: 'var(--avg-vol)' }}
              />
              10w <span style={{ color: 'var(--text-2)' }}>{scenario.ma10?.toFixed(2)}</span>
            </span>
          </>
        )}
        <div className={s.spacer} />
        <div className={s.studyChips} role="group" aria-label="Studies">
          {STUDIES.map((st) => (
            <button
              key={st.id}
              className={`${s.studyChip} ${show[st.id] ? '' : s.studyChipOff}`}
              aria-pressed={show[st.id]}
              onClick={() => setShow((prev) => ({ ...prev, [st.id]: !prev[st.id] }))}
            >
              {st.label}
            </button>
          ))}
          <span className={s.lockedChip} title="Unlocks in Phase 2">
            🔒︎ SECTOR
          </span>
          <span className={s.lockedChip} title="Unlocks in Phase 2">
            🔒︎ BREADTH
          </span>
        </div>
      </div>

      <div className={s.chartBody}>
        <StageChart bars={bars} position={position} show={show} />
      </div>
    </section>
  );
}
