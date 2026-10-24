import { useState } from 'react';
import { App } from '../../App';
import type { Level } from '@investment-tycoon/engine';
import { withRunParams } from '../../game/dev';
import { StageBandsContext } from '../components/chart/stageBandsContext';
import { DevOverlay } from './DevOverlay';

/**
 * The app under `?dev=1`: the normal screen with hidden-stage bands on, plus
 * the dev panel. Changing level or seed regenerates the chart and rewrites the URL.
 */
export function DevRoot(initial: { seed: number; level: Level }) {
  const [run, setRun] = useState(initial);

  const change = (next: { seed: number; level: Level }) => {
    setRun(next);
    window.history.replaceState(null, '', withRunParams(window.location.search, next));
  };

  return (
    <StageBandsContext.Provider value={true}>
      <App seed={run.seed} level={run.level}>
        <DevOverlay seed={run.seed} level={run.level} onChange={change} />
      </App>
    </StageBandsContext.Provider>
  );
}
