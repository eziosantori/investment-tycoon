import { isAtEnd, runWeekOfBar } from '@investment-tycoon/engine';
import { SPEEDS } from '../../playback/clock';
import { clockLabel } from '../../playback/clockLabel';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import s from './trading.module.css';

/** Top HUD: level badge, run week, playback controls and seed. Only working controls are shown. */
export function HudTop() {
  const timeline = useTimeline();
  const level = useUiStore((st) => st.level);
  const cursor = useUiStore((st) => st.cursor);
  const paused = useUiStore((st) => st.paused);
  const speed = useUiStore((st) => st.speed);
  const play = useUiStore((st) => st.play);
  const togglePaused = useUiStore((st) => st.togglePaused);
  const nextDay = useUiStore((st) => st.nextDay);
  const nextWeek = useUiStore((st) => st.nextWeek);

  const weeks = timeline.runWeeks;
  const week = Math.min(weeks, Math.max(1, runWeekOfBar(timeline, cursor)));
  const ended = isAtEnd(timeline, cursor);

  return (
    <header className={s.hud}>
      <div className={s.rank}>
        <div className={s.badge} aria-label={`Level ${level}`}>
          <span>{level}</span>
        </div>
      </div>

      <div className={s.phase}>
        <div className={s.pips} aria-label={`Week ${week} of ${weeks}`}>
          {Array.from({ length: weeks }, (_, i) => {
            const w = i + 1;
            const cls = w < week ? s.pipPast : w === week ? s.pipCurrent : undefined;
            return <div key={w} className={`${s.pip} ${cls ?? ''}`} />;
          })}
          <span className={s.weekLabel}>
            WEEK <b>{week}</b>/{weeks}
          </span>
        </div>
      </div>

      <div className={s.playback}>
        <div className={s.speedGroup} role="group" aria-label="Playback">
          <button
            className={`${s.speedBtn} ${s.speedPause} ${paused ? s.speedActive : ''}`}
            onClick={togglePaused}
            disabled={ended}
            aria-label={paused ? 'Play' : 'Pause'}
            title={paused ? 'Play (Space)' : 'Pause (Space)'}
          >
            {paused ? '▶' : '❚❚'}
          </button>
          {SPEEDS.map((sp) => (
            <button
              key={sp}
              className={`${s.speedBtn} ${!paused && sp === speed ? s.speedActive : ''}`}
              onClick={() => play(sp)}
              disabled={ended}
              aria-pressed={!paused && sp === speed}
              title={`Play at ${sp}× (${sp})`}
            >
              {sp}×
            </button>
          ))}
          <button
            className={`${s.speedBtn} ${s.speedNext}`}
            onClick={() => nextDay(timeline)}
            disabled={ended}
            title="Jump to the session close"
          >
            NEXT DAY ▸
          </button>
          <button
            className={`${s.speedBtn} ${s.speedNext}`}
            onClick={() => nextWeek(timeline)}
            disabled={ended}
            title="Jump to the week close"
          >
            NEXT WEEK ▸
          </button>
        </div>
        <div className={s.clock}>
          <span className={s.clockTime}>{clockLabel(cursor)}</span>
          <span className={s.seed}>seed {timeline.seed}</span>
        </div>
      </div>
    </header>
  );
}
