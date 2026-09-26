import { PLAYER, RUN } from './placeholder';
import s from './trading.module.css';

const SPEEDS = ['1×', '2×', '5×'] as const;
const COMING = 'Playback arrives in M1';

export function HudTop({ seed }: { seed: number }) {
  const xpPct = (PLAYER.xp / PLAYER.xpToNext) * 100;
  return (
    <header className={s.hud}>
      <div className={s.rank}>
        <div className={s.badge} aria-label={`Level ${PLAYER.level}`}>
          <span>{PLAYER.level}</span>
        </div>
        <div className={s.rankInfo}>
          <div className={s.rankRow}>
            <span className={s.rankTitle}>{PLAYER.title}</span>
            <span className={s.xpText}>
              {PLAYER.xp.toLocaleString('en-US')} / {PLAYER.xpToNext.toLocaleString('en-US')} XP
            </span>
          </div>
          <div className={s.xpTrack}>
            <div className={s.xpFill} style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </div>

      <div className={s.phase}>
        <div className={s.phaseTitle}>{RUN.phaseLabel}</div>
        <div className={s.pips} aria-label={`Week ${RUN.week} of ${RUN.weeks}`}>
          {Array.from({ length: RUN.weeks }, (_, i) => {
            const week = i + 1;
            const cls = week < RUN.week ? s.pipPast : week === RUN.week ? s.pipCurrent : undefined;
            return <div key={week} className={`${s.pip} ${cls ?? ''}`} />;
          })}
          <span className={s.weekLabel}>
            WEEK <b>{RUN.week}</b>/{RUN.weeks}
          </span>
        </div>
      </div>

      <div className={s.playback}>
        <div className={s.speedGroup}>
          <button className={`${s.speedBtn} ${s.speedPause}`} disabled title={COMING}>
            ❚❚
          </button>
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              className={`${s.speedBtn} ${sp === '2×' ? s.speedActive : ''}`}
              disabled
              title={COMING}
            >
              {sp}
            </button>
          ))}
          <button className={`${s.speedBtn} ${s.speedNext}`} disabled title={COMING}>
            NEXT DAY ▸
          </button>
        </div>
        <div className={s.clock}>
          <span className={s.clockTime}>{RUN.clock}</span>
          <span className={s.seed}>seed {seed}</span>
        </div>
      </div>
    </header>
  );
}
