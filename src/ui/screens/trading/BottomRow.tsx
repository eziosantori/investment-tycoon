import type { DemoScenario } from '../../../game/demoScenario';
import { rMultiple, signedMoney } from '../../format';
import { MENTOR, PAST_TRADES, QUESTS, STREAK, type LogRow } from './placeholder';
import s from './trading.module.css';

function Mentor() {
  return (
    <section className={`${s.panel} ${s.mentor}`} aria-label="Mentor">
      <div className={s.mentorFace}>
        <div className={s.portrait}>mentor</div>
        <span className={s.mentorName}>{MENTOR.name}</span>
      </div>
      <div className={s.bubble}>
        <p className={s.bubbleText} style={{ margin: 0 }}>
          {MENTOR.before}
          <span className={s.term}>{MENTOR.term}</span>
          {MENTOR.after}
        </p>
        <div className={s.pills}>
          <span className={`${s.pill} ${s.pillPrimary}`}>Got it</span>
          <span className={s.pill}>Teach me · +40 XP</span>
        </div>
      </div>
    </section>
  );
}

function LogLine({ row }: { row: LogRow }) {
  const pnlCls = row.pnl >= 0 ? s.up : s.down;
  return (
    <div className={`${s.logRow} ${row.live ? s.logRowLive : ''}`}>
      <span className={s.dim}>#{row.id}</span>
      <span style={{ fontWeight: 700 }}>{row.ticker}</span>
      <span className={row.side === 'long' ? s.up : s.down} style={{ fontWeight: 700 }}>
        {row.side === 'long' ? '▲ LONG' : '▼ SHORT'}
      </span>
      <span className={`${s.right} ${pnlCls}`}>{signedMoney(row.pnl)}</span>
      <span className={`${s.right} ${pnlCls}`}>{rMultiple(row.r)}</span>
      <span className={`${s.flagChip} ${s[row.flag.tone]}`}>{row.flag.label}</span>
      <span
        className={`${s.right} ${row.xp !== 'live' && row.flag.tone === 'good' ? s.xp : s.dim}`}
      >
        {row.xp === 'live' ? 'live' : `${row.xp > 0 ? '+' : ''}${row.xp} XP`}
      </span>
    </div>
  );
}

function BattleLog({ scenario }: { scenario: DemoScenario }) {
  const live: LogRow = {
    id: 14,
    ticker: scenario.ticker,
    side: 'long',
    pnl: scenario.position.openPnl,
    r: scenario.position.openR,
    flag: { label: 'S2 BRK', tone: 'good' },
    xp: 'live',
    live: true,
  };
  return (
    <section className={`${s.panel} ${s.log}`} aria-label="Battle log">
      <div className={s.logHead}>
        <span className={s.title}>BATTLE LOG</span>
        <div className={s.spacer} />
        <span className={s.streak}>🔥︎ DISCIPLINE STREAK ×{STREAK}</span>
      </div>
      <div className={s.logRows}>
        {[live, ...PAST_TRADES].map((row) => (
          <LogLine key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}

function SideQuests() {
  return (
    <section className={`${s.panel} ${s.quests}`} aria-label="Side quests">
      <span className={s.title}>SIDE QUESTS</span>
      <div className={s.questList}>
        {QUESTS.map((q) => (
          <div key={q.label} className={s.quest}>
            <span className={`${s.questBox} ${q.done ? s.questDone : ''}`}>
              {q.done ? '✓' : ''}
            </span>
            <span className={`${s.questLabel} ${q.done ? s.questLabelDone : ''}`}>{q.label}</span>
            <span className={`${s.questReward} ${q.done ? s.questRewardDone : ''}`}>
              {q.reward}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BottomRow({ scenario }: { scenario: DemoScenario }) {
  return (
    <div className={s.bottomRow}>
      <Mentor />
      <BattleLog scenario={scenario} />
      <SideQuests />
    </div>
  );
}
