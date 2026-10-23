# Investment Tycoon

An educational trading game: the player reads a generated market with
Weinstein Stage Analysis and trades it under prop-firm rules.

## Market

**Stage**:
One of Weinstein's four phases of a price cycle: 1 Base, 2 Advance, 3 Top, 4 Decline.
_Avoid_: phase, regime (in player-facing language)

**Hidden stage**:
The generator's ground-truth stage for an instrument at a given week. Never shown during play; revealed in the post-mortem.
_Avoid_: true stage, regime

**Stage call**:
The stage the player declares for a stock before entering a trade.
_Avoid_: guess, prediction

**Classified stage**:
The stage a rule-based classifier assigns using only data up to the current week. Used to score stage calls fairly.
_Avoid_: detected stage

**Index (TYX)**:
The fictional market index every stock is measured against. It has its own hidden stage cycle.
_Avoid_: benchmark, market (when the index is meant)

**Breakout**:
A stock leaving a Stage 1 base upward, on volume well above its average.

**Failed breakout**:
A breakout that falls back into Stage 1 within a few weeks instead of advancing.

**Breakdown**:
A stock leaving a base or a top downward into Stage 4.

**Market timeline**:
The whole generated market of a run, warm-up included, fixed by the seed before the first bar is shown.
_Avoid_: simulation, price feed

**Deal**:
The balanced spread of starting stages across the stocks at the start of a run, so every seed offers some setups and some traps.
_Avoid_: scenario (reserved for scripted case files)

**Universe**:
The set of stocks a run trades, plus the index.
_Avoid_: watchlist (the watchlist is a UI panel)

## Time

**Bar**:
The base unit of market time: 65 minutes of trading, one candle on the 65m timeframe.
_Avoid_: candle (when the time unit is meant), tick

**Substep**:
One twelfth of a bar: a point on the price path inside a bar, used only to decide which order was hit first.

**Session**:
One trading day: six bars.
_Avoid_: day (in the engine)

**Week**:
Five sessions. The unit of the stage cycle and of the weekly studies.

**Warm-up**:
Market history generated before the run starts, so the chart and its studies are complete on the first bar.
_Avoid_: pre-history, burn-in

**Cursor**:
The point of the market timeline the player has reached. Everything after it is unseen.
_Avoid_: now, playhead

**Forming bar**:
The current week's or session's bar while it is still being built, up to the cursor. Studies ignore it until it closes.
_Avoid_: live bar, partial bar

**Seed**:
The number that fully determines a market. Same seed, same market, whatever the player does.

## Progression

**Level**:
The player's rank, 1 to 8. Each level unlocks one tool on the chart or in the loadout.
_Avoid_: tier, phase (phases are career steps)

**Trial**:
The skill test that must be passed to reach the next level. XP alone never levels up.
_Avoid_: quest (quests are optional side goals)
