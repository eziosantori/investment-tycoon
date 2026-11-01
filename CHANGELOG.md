# Changelog

## M2: Trading & accounting (unreleased)

- A trading sandbox on the trading screen: a $100,000 starting balance, market
  orders on any of the 12 stocks (the TYX index isn't tradable), one position
  per stock, several stocks at once, trading while the market plays.
- Every order pays the spread: buys fill at the ask, sells at the bid, rounded
  against the player; 5–15 bps per stock, wider on small, volatile names. No
  commissions. Engine version 3 (the market itself is unchanged: same golden
  hash for the pinned seed).
- No leverage: total exposure, long and short, is capped at equity, and short
  proceeds add no buying power. An order that would be refused has its button
  disabled with the reason; a refusal shows under the buttons for 3 seconds.
- ORDER panel with a − / + stepper (default ≈ 10% of equity, steps of 10) and
  "Cost ≈ $X · Y% of account". Lv1–6: BUY and SELL ALL. Lv7: SHORT, SELL n,
  COVER n and FLATTEN (`?level=7`); no order flips a position in one go.
- BANKROLL card (equity, open P&L with sign and arrow), HOLDING / LONG / SHORT
  card for the selected stock, ▲ / ▼ markers in the ticker switcher, and a
  BATTLE LOG of round trips (open trades first as live rows, realized total).
- Keyboard: B, S and F press the button with that keycap; Space and 1/2/5
  unchanged. At the end of the market trading stops and an overlay shows final
  equity, realized P&L, trades and the positions still open.
- Engine: the run is a plain state changed only by `advanceTo` and `apply`
  (ADR-0005); money in integer cents. The seed plus the command log rebuild the
  run exactly (property-tested over random seeds and logs); the M2 demo script
  is an engine test.
- Mentor concepts: long, short selling, spread, realized vs open P&L.

**Teaches:** _long_, _short selling_, _spread_, _realized vs open P&L_.

## M1: Market engine & playback (2026-10-23)

- A living fictional market: TYX index + 12 stocks, ~3 years of warm-up history
  then a 10-week run. Stocks follow beta × index plus their own stage cycle
  (1 Base → 2 Advance → 3 Top → 4 Decline, with failed breakouts, breakdowns and
  re-accumulation). Breakouts come on 2–3× volume, often with a gap; breakdowns
  on heavy volume. Same seed, same market (`?seed=`); engine version 2.
- Prices are 65-minute bars (6 a day) aggregated to daily and weekly, in integer
  cents and shares; studies: MA 10w/30w, average volume 10w, Mansfield RS.
- Playback: pause / 1× / 2× / 5×, NEXT DAY, NEXT WEEK; Space and 1/2/5 keys; HUD
  clock and run-week pips. At the end of the run, start a new seed.
- Timeframe chips W / D / 65m with the forming bar; ticker switcher and an
  instrument side panel quoting every ticker at the cursor.
- Chart layers unlock by level (`?level=1`–`8`): price line at Lv1, then 30w MA,
  candles, volume, 10w MA and RS; locked tools show as dashed "Lv N" chips.
- Mentor concepts: stage, 30-week MA, relative strength, volume, trend.
- Dev only: `?dev=1` shows the hidden stages under the chart with a level/seed
  selector and the deal; `?dev=gallery` shows all 12 stocks with their stages.
- Removed the M0 generator and placeholder chart data.

**Teaches:** _stage analysis_, _30-week MA_, _relative strength_, _volume confirmation_.

## M0: Project skeleton & design system (2026-09-26)

- Vite + React 19 + TypeScript (strict), ESLint, Prettier, Vitest; GitHub Actions CI
  (format, lint, typecheck, test, build); Cloudflare Workers static-assets config.
- v3 "game HUD" design tokens as CSS variables, colorblind palette (`?cb=1`),
  `prefers-reduced-motion` support; Chakra Petch / Inter / JetBrains Mono.
- Engine: seeded PRNG with independent named streams; stage-cycle market
  generator (TYX index + one stock, daily bars aggregated to weekly); studies:
  MA 10w/30w, avg volume 10w, Mansfield RS, 30w slope.
- Screen 01 layout shell: HUD, mission/HP bars, chart card, mentor, battle log,
  side quests, stage call, loadout, active position. The chart is real and
  seeded (`?seed=`); stage call and MA/VOL/RS toggles work; most other values
  are placeholders from the design handoff. `?nostop=1` shows the no-stop variant.
- Chart decision: custom SVG (docs/ARCHITECTURE.md §1.1).

**Teaches:** nothing yet (infrastructure).
