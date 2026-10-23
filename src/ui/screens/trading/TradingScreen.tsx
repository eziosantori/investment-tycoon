import { ENGINE_VERSION } from '../../../engine/version';
import { usePlaybackLoop } from '../../playback/usePlaybackLoop';
import { useTimeline } from '../../state/timeline';
import { ChartCard } from './ChartCard';
import { HudTop } from './HudTop';
import { InstrumentPanel } from './InstrumentPanel';
import s from './trading.module.css';

/**
 * Screen 01: the trading HUD. M1 shows only what works: the HUD with playback,
 * the chart card and the instrument side panel. The status row (HP, mission), loadout and bottom row
 * (mentor, battle log, quests) return in their milestones.
 */
export function TradingScreen() {
  const timeline = useTimeline();
  usePlaybackLoop(timeline);

  return (
    <main className={`${s.screen} ${s.screenNoStatus}`} data-screen-label="01 Trading · Game">
      <HudTop />
      <div className={s.main}>
        <div className={`${s.leftCol} ${s.leftColNoBottom}`}>
          <ChartCard />
        </div>
        <div className={s.rightCol}>
          <InstrumentPanel />
        </div>
      </div>
      <div className={s.buildInfo}>
        v{__APP_VERSION__} · {__APP_COMMIT__} · engine {ENGINE_VERSION} · Educational game.
        Fictional markets, no real money, not financial advice.
      </div>
    </main>
  );
}
