import { useMemo, useState } from 'react';
import {
  generateMarketTimeline,
  type Level,
  LEVELS,
  parseLevel,
  STAGE_LABELS,
} from '@investment-tycoon/engine';
import { galleryViews, withRunParams } from '../../game/dev';
import { parseSeed, randomSeed } from '../../game/seed';
import { StageChart } from '../components/chart/StageChart';
import s from './dev.module.css';

/**
 * The `?dev=gallery` page: the 12 weekly charts of the seed side by side, each
 * with its hidden-stage bands, at the end of the run. Linked from nowhere.
 * Changing seed or level regenerates the charts and rewrites the URL.
 */
export function DevGallery(initial: { seed: number; level: Level }) {
  const [run, setRun] = useState(initial);
  const [seedText, setSeedText] = useState(String(initial.seed));
  const parsedSeed = parseSeed(seedText);

  const timeline = useMemo(() => generateMarketTimeline(run.seed), [run.seed]);
  const views = useMemo(() => galleryViews(timeline, run.level), [timeline, run.level]);

  const change = (next: { seed: number; level: Level }) => {
    setRun(next);
    setSeedText(String(next.seed));
    window.history.replaceState(null, '', withRunParams(window.location.search, next));
  };

  return (
    <main className={s.gallery}>
      <header className={s.galleryHead}>
        <h1 className={s.title}>STAGE GALLERY</h1>
        <form
          className={s.field}
          onSubmit={(e) => {
            e.preventDefault();
            if (parsedSeed != null) change({ ...run, seed: parsedSeed });
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
          <button type="submit" disabled={parsedSeed == null || parsedSeed === run.seed}>
            Go
          </button>
          <button type="button" onClick={() => change({ ...run, seed: randomSeed() })}>
            New
          </button>
        </form>
        <label className={s.field}>
          <span>Level</span>
          <select
            value={run.level}
            onChange={(e) => change({ ...run, level: parseLevel(e.target.value) ?? run.level })}
          >
            {LEVELS.map((lv) => (
              <option key={lv} value={lv}>
                Lv{lv}
              </option>
            ))}
          </select>
        </label>
        <span className={s.galleryNote}>
          weekly · end of run · {timeline.index.info.ticker}{' '}
          {STAGE_LABELS[timeline.deal.indexStage]} at run start
        </span>
      </header>
      <div className={s.galleryGrid}>
        {views.map((view) => {
          const stage = view.bars[view.bars.length - 1]?.stage;
          return (
            <section key={view.instrument.ticker} className={s.galleryCard}>
              <div className={s.galleryCardHead}>
                <span className={s.ticker}>{view.instrument.ticker}</span>
                <span className={s.galleryName}>{view.instrument.name}</span>
                {stage != null && (
                  <span className={s.stage} style={{ background: `var(--stage-${stage})` }}>
                    {STAGE_LABELS[stage]}
                  </span>
                )}
              </div>
              <div className={s.galleryChart}>
                <StageChart view={view} bands />
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
