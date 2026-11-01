import { ENGINE_VERSION } from '@investment-tycoon/engine';
import { usePlaybackKeys } from '../../playback/usePlaybackKeys';
import { usePlaybackLoop } from '../../playback/usePlaybackLoop';
import { useUiStore } from '../../state/store';
import { useTimeline } from '../../state/timeline';
import { BattleLog } from './BattleLog';
import { ChartCard } from './ChartCard';
import { EndOfMarket } from './EndOfMarket';
import { HudTop } from './HudTop';
import { Bankroll } from './Bankroll';
import { InstrumentPanel } from './InstrumentPanel';
import o from './order.module.css';
import { HoldingCard } from './HoldingCard';
import { OrderPanel } from './OrderPanel';
import s from './trading.module.css';

/** From this level the screen takes the Lv6 artboard's layout (188px battle log row). */
const STAGE_ANALYST_LEVEL = 6;

/**
 * Screen 01: the trading HUD. Only what works is shown: the HUD with playback,
 * the status row with the BANKROLL alone in its slot (mission and HP return in
 * M4), the chart card over the battle log, and the right column with the
 * instrument panel and ORDER. Loadout, mentor and quests return in their milestones.
 */
export function TradingScreen() {
  const timeline = useTimeline();
  usePlaybackLoop(timeline);
  usePlaybackKeys(timeline);
  const level = useUiStore((st) => st.level);

  return (
    <main className={s.screen} data-screen-label="01 Trading · Game">
      <HudTop />
      <EndOfMarket />
      <div className={o.statusRow}>
        <Bankroll />
      </div>
      <div className={s.main}>
        <div className={`${s.leftCol} ${level >= STAGE_ANALYST_LEVEL ? s.leftColFull : ''}`}>
          <ChartCard />
          <BattleLog />
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
