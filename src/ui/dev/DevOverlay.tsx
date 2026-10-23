import { useMemo, useState } from 'react';
import { LEVELS, parseLevel, type Level } from '../../engine/chart/tools';
import { STAGE_LABELS } from '../../engine/chart/stageBands';
import { dealReadout } from '../../game/dev';
import { parseSeed, randomSeed } from '../../game/seed';
import { useTimeline } from '../state/timeline';
import s from './dev.module.css';

/**
 * The `?dev=1` panel: level and seed selector plus the run's deal. Floats over
 * the screen; the hidden-stage bands are drawn by the charts themselves.
 */
interface Props {
  seed: number;
  level: Level;
  onChange: (run: { seed: number; level: Level }) => void;
}

export function DevOverlay({ seed, level, onChange }: Props) {
  const timeline = useTimeline();
  const deal = useMemo(() => dealReadout(timeline), [timeline]);
  const [seedText, setSeedText] = useState(String(seed));
  const [prevSeed, setPrevSeed] = useState(seed);
  if (prevSeed !== seed) {
    setPrevSeed(seed);
    setSeedText(String(seed));
  }
  const parsedSeed = parseSeed(seedText);

  return (
    <aside className={s.overlay} aria-label="Developer overlay">
      <div className={s.title}>DEV</div>
      <div className={s.row}>
        <label className={s.field}>
          <span>Level</span>
          <select
            value={level}
            onChange={(e) => onChange({ seed, level: parseLevel(e.target.value) ?? level })}
          >
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                Lv{lv}
              </option>
            ))}
          </select>
        </label>
        <form
          className={s.field}
          onSubmit={(e) => {
            e.preventDefault();
            if (parsedSeed != null) onChange({ seed: parsedSeed, level });
          }}
        >
          <span>Seed</span>
          <input
            className={s.seed}
            value={seedText}
            inputMode="numeric"
            aria-invalid={parsedSeed == null}
            onChange={(e) => setSeedText(e.target.value)}
          />
          <button type="submit" disabled={parsedSeed == null || parsedSeed === seed}>
            Go
          </button>
          <button type="button" onClick={() => onChange({ seed: randomSeed(), level })}>
            New
          </button>
        </form>
      </div>
      <div className={s.deal}>
        <div className={s.dealHead}>
          DEAL · {deal.index.ticker} {STAGE_LABELS[deal.index.stage]}
        </div>
        <table>
          <tbody>
            {deal.stocks.map((row) => (
              <tr key={row.ticker} className={s[roleClass[row.role]]}>
                <td className={s.ticker}>
                  {row.ticker}
                  {row.ticker === deal.defaultInstrument ? ' ★' : ''}
                </td>
                <td>
                  <span className={s.stage} style={{ background: `var(--stage-${row.stage})` }}>
                    {STAGE_LABELS[row.stage]}
                  </span>
                </td>
                <td>{row.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </aside>
  );
}

const roleClass = { 'setting up': 'setup', trap: 'trap', neutral: 'neutral' } as const;
