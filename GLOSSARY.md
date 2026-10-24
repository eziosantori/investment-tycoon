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

## Trading

**Mid**:
The last revealed price of a stock: the close of the bar at the cursor. Positions are valued at the mid.
_Avoid_: last, mark (in player-facing language)

**Bid / Ask**:
The prices the player sells at and buys at: the mid minus and plus half the spread.

**Spread**:
The gap between ask and bid, fixed per stock. The only cost of trading.
_Avoid_: commission, fee

**Market order**:
An order to buy or sell a number of shares now, filled at the ask (buy) or the bid (sell).

**Fill**:
One executed order: stock, side, shares and price.

**Position**:
The shares the player holds in one stock: long (shares owned) or short (shares borrowed and sold). At most one per stock; an order may shrink a position to flat but never flip it.
_Avoid_: holding (except as a UI label), lot

**Long / Short**:
A position that profits when the price rises / falls. Short selling unlocks at Lv7.

**Flat**:
Having no position in a stock.

**Flatten**:
Closing a whole position with a market order.
_Avoid_: liquidate (reserved for a rule breach)

**Trade**:
A round trip in one stock, from flat back to flat. Adding to or trimming the position stays inside the same trade.
_Avoid_: deal (the deal is the starting spread of stages), position

**Cash**:
Money in the account not tied up in positions; short sale proceeds are added to it.

**Equity**:
Cash plus every position valued at the mid (a short counts as a liability). What the account is worth right now.
_Avoid_: balance, bankroll (the bankroll is the UI widget that shows equity)

**Open P&L**:
The gain or loss of the open positions at the mid, against what they cost. Right after a buy it is slightly negative: the spread.
_Avoid_: unrealized P&L (in player-facing language), floating P&L

**Realized P&L**:
The gain or loss locked in by closing shares.

**Exposure**:
The value at the mid of all positions, long and short, added as positive amounts.
_Avoid_: notional

**Buying power**:
How much exposure the account may still add: equity minus exposure. An order that needs more is rejected.
_Avoid_: margin

**Starting balance**:
The equity a run starts with: $100,000.

**Command**:
One player action recorded at the bar where it was issued, such as a market order or a flatten.

**Command log**:
Every command of a run, in order. With the seed it reproduces the run exactly.
_Avoid_: history, journal

**Battle log**:
The UI table of the player's trades, open ones first.
_Avoid_: trade history

## Progression

**Level**:
The player's rank, 1 to 8. Each level unlocks one tool on the chart or in the loadout.
_Avoid_: tier, phase (phases are career steps)

**Trial**:
The skill test that must be passed to reach the next level. XP alone never levels up.
_Avoid_: quest (quests are optional side goals)
