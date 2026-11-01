import { ENGINE_VERSION } from '@investment-tycoon/engine';
import { usePlaybackKeys } from '../../playback/usePlaybackKeys';
import { usePlaybackLoop } from '../../playback/usePlaybackLoop';
import { useTimeline } from '../../state/timeline';
import { ChartCard } from './ChartCard';
import { EndOfMarket } from './EndOfMarket';
import { HudTop } from './HudTop';
import { Bankroll } from './Bankroll';
import { InstrumentPanel } from './InstrumentPanel';
import o from './order.module.css';
import { HoldingCard } from './HoldingCard';
import { OrderPanel } from './OrderPanel';
import s from './trading.module.css';

/**
 * Screen 01: the trading HUD. Only what works is shown: the HUD with playback,
 * the status row with the BANKROLL alone in its slot (mission and HP return in
 * M4), the chart card, and the right column with the instrument panel and
 * ORDER. Loadout and the bottom row (mentor, quests) return in their milestones.
 */
export function TradingScreen() {
  const timeline = useTimeline();
  usePlaybackLoop(timeline);
  usePlaybackKeys(timeline);

  return (
    <main className={s.screen} data-screen-label="01 Trading · Game">
      <HudTop />
      <EndOfMarket />
      <div className={o.statusRow}>
        <Bankroll />
      </div>
      <div className={s.main}>
        <div className={s.leftCol}>
          <ChartCard />
        </div>
        <div className={s.rightCol}>
          <InstrumentPanel />
          <OrderPanel />
          <HoldingCard />
        </div>
      </div>
      <div className={s.buildInfo}>
        v{__APP_VERSION__} · {__APP_COMMIT__} · engine {ENGINE_VERSION} · Educational game.
        Fictional markets, no real money, not financial advice.
      </div>
    </main>
  );
}
