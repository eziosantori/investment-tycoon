import { useMemo } from 'react';
import { buildWeeklyChart } from '../../../engine/market/weeklyChart';
import { ENGINE_VERSION } from '../../../engine/version';
import { buildDemoScenario } from '../../../game/demoScenario';
import { BottomRow } from './BottomRow';
import { ChartCard } from './ChartCard';
import { HudTop } from './HudTop';
import { Loadout } from './Loadout';
import { StatusRow } from './StatusRow';
import s from './trading.module.css';

interface Props {
  seed: number;
  /** Design variant: position without a protective stop. */
  noStop: boolean;
}

/** Screen 01: the trading HUD. M0 is a layout shell over a real seeded weekly chart. */
export function TradingScreen({ seed, noStop }: Props) {
  const chart = useMemo(() => buildWeeklyChart(seed), [seed]);
  const scenario = useMemo(() => buildDemoScenario(chart.stock), [chart]);
  const p = scenario.position;
  const chartPosition = {
    entryIndex: p.entryIndex,
    entry: p.entry,
    stop: noStop ? null : p.stop,
    target: p.target,
  };

  return (
    <main className={s.screen} data-screen-label="01 Trading · Game">
      <HudTop seed={seed} />
      <StatusRow equity={scenario.equity} openPnl={scenario.position.openPnl} />
      <div className={s.main}>
        <div className={s.leftCol}>
          <ChartCard bars={chart.stock} scenario={scenario} position={chartPosition} />
          <BottomRow scenario={scenario} />
        </div>
        <Loadout scenario={scenario} noStop={noStop} />
      </div>
      <div className={s.buildInfo}>
        v{__APP_VERSION__} · {__APP_COMMIT__} · engine {ENGINE_VERSION} · Educational game.
        Fictional markets, no real money, not financial advice.
      </div>
    </main>
  );
}
