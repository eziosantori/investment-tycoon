# Handoff: Investment Tycoon: Phase 1 Prop-Firm Challenge (M0)

## Overview
Investment Tycoon is an educational trading/investing tycoon **browser game**. In Phase 1 the player takes a **prop-firm challenge**: hit a profit target on a simulated, fictional market without breaking drawdown limits. Breaking a limit ends the run immediately.

The technical approach is **Stage Analysis (Weinstein style)**. The core tools are:
- the 30-week moving average (the "stage line") and the 10-week MA
- volume against its 10-week average
- Mansfield Relative Strength against a fictional market index (TYX)
- timeframes limited to **Weekly / Daily / 65-minute**. There are no intraday timeframes below 65m, and there is no RSI/MACD.

The player **calls the stage** (1 Base · 2 Advance · 3 Top · 4 Decline) before entering. The true stages are hidden during play and **revealed in the post-mortem**.

## About the Design Files
The files in this bundle are **design references created in HTML**: prototypes that show the intended look and behavior. They are **not production code to copy directly**. The task is to **recreate these designs in the target codebase's environment**, using its established patterns and libraries. If no environment exists yet, choose a suitable stack; for a browser game with dense, live-updating UI, React + a canvas/SVG chart layer is a reasonable default.

Each `.dc.html` opens directly in a browser. It needs the sibling `support.js`, which is only a preview runtime and not part of the design. The markup uses inline styles, so every value is readable in the source. Charts are generated in each file's logic class (`class Component`) from a seeded PRNG (seed `48213`). Read these classes to understand the chart data model, then replace them with the game's real simulation.

## Fidelity
**High-fidelity.** Colors, typography, spacing and layout are final for M0. Recreate them pixel-accurately at the 1440×900 design size.

**Important: visual direction status**
- `01 Trading Screen v3 Game` is the **approved direction**: a game HUD with XP, HP bars, quests and a mentor.
- Screens 02–05 are still in the **v2 "terminal" styling**: same content model, a more sober look. When implementing them, **apply the v3 game treatment** (Chakra Petch display labels, HP-bar language, XP rewards, rounded 6px panels, violet glow accents) while keeping their structure and copy.
- `reference/01 Trading Screen v2` is the sober version of screen 1. Keep it for reference only; it is useful for data density and the full trade-log columns.

---

## Screens / Views

### 01: Trading Screen (v3 Game), the most important screen
**Purpose:** the main gameplay loop. Read the weekly chart, call the stage, size the position, and buy/sell while protecting HP.

**Canvas:** 1440×900. Background is `radial-gradient(ellipse 80% 60% at 50% 0%, #141630 0%, #0A0B12 60%)`. Root grid rows: `60px 88px 1fr`.

**Row 1: HUD top (60px).** Grid `360px 1fr 420px`, padding 0 16px, gap 16.
- *Rank badge:* a 32px square rotated 45°, `linear-gradient(135deg,#8F7EF3,#5B4BC4)`, radius 4, glow `0 0 16px rgba(143,126,243,.5)`. It holds the level number "3" (Chakra Petch 700 15px, white). Next to it:
  - title "JUNIOR TRADER" (Chakra Petch 700 14px, uppercase, +0.04em)
  - "1,240 / 2,000 XP" (JetBrains Mono 10px `#9A95C9`)
  - an XP bar 6px high, track `#1C1B33`, fill `linear-gradient(90deg,#6C5CE0,#B3A6FF)` at 62%, glow `0 0 8px #8F7EF3`.
- *Center:* "PHASE 1 · THE CHALLENGE" (Chakra Petch 700 13px, +0.18em, `#C9C4F5`), with 10 week pips below it. Each pip is 26×8 with a parallelogram clip-path of `polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)`. Colors: past `#6E6A96`, current `#B3A6FF` (pulsing), future `#1E1D33`. Then "WEEK 4/10".
- *Right:* playback buttons (28px tall, bg `#1A1930`, radius 4, Chakra Petch 700 12px): ❚❚ · 1× · **2×** (active: bg `#8F7EF3`, text `#0A0B12`) · 5× · NEXT DAY ▸. Then a clock "THU · 14:40" (Chakra Petch 700 15px) with "seed 48213" below it, separated by a 1px left border `#26244A`.

**Row 2: Mission / HP (88px, padding 0 16 10, gap 10).** Grid `1.15fr 1fr 1fr 300px`. Each card: bg `#11122099`, border `1px #23254A`, radius 6, padding 10×14.
- *MISSION · +10%:* a green diamond icon (a 10px square with a 2px border, rotated 45°), value "+2.6%" (Mono 700 18px, up color), and a **10-segment bar**. Segments are 14px tall, gap 3, radius 2; filled segments have a glow, the partial segment uses a hard-stop gradient, and the last segment shows a gold ★ `#F5C542`. Caption: "$7,398 to unlock Phase 2 · 6 weeks left".
- *DAILY HP:* ♥ icon, "58/100", amber `#F2A93B` segments, damage track `#2A1520`. Caption: "−2.1% of −5.0% taken today · refills at open".
- *ACCOUNT HP:* shield icon (hexagon clip-path), "57/100", with the number pulsing (1.8s). The bar animates `brightness 1→1.35`. The card has a red tint: bg `#1A111899`, border `#4A2A2E`. Caption: "−4.3% of −10.0% · game over at $90k".
- *BANKROLL:* "$102,601.82" (Mono 700 24px, cents in `#6E6A96`) and "open +$191.82 ▲". A floating "+25 XP" toast sits top-right (Chakra Petch 700 12px `#B3A6FF`, animation `gFloat` 3s).

**HP mapping:** HP = remaining limit / limit × 100.
- Daily: (5.0 − 2.1) / 5.0 = 58.
- Account: (10 − 4.3) / 10 = 57.

**Row 3: Main.** Grid `1fr 330px`, gap 10, padding 0 16 14.

*Left column:* rows `1fr 188px`, gap 10.
- **Chart card:** bg `#0C0D18`, border `#23254A`, radius 6. It has 4 violet **HUD corner brackets** (14×14, 2px `#8F7EF3`).
  - *Toolbar (38px, nowrap):* "KRVX" (Chakra Petch 700 16px) · "43.17 +0.77% ▲" · timeframe chips W (active: violet bg) / D / 65m · MA legends "30w 38.9 ↗" and "10w …" · study chips MA / VOL / RS · locked chips "🔒 SECTOR", "🔒 BREADTH" (dashed border `#33315A`, text `#4E4B78`).
  - *Chart body (SVG, internal viewBox 1072×452):* three stacked panes.
    1. **Price, weekly candles, 108 bars.** 30w MA: 2.25px `#E6E8F0` with a 6px `#B3A6FF` glow underlay at 12% opacity. 10w MA: 1.25px `#6E6A96`. Stage-1 base box: violet 6% fill, labeled "STAGE 1 BASE · 48 WEEKS". Player's resistance line: dashed `6 3` `#8F7EF3` at 42.20. Entry marker: an up-color triangle with a soft halo under the breakout bar. Profit zone (7%) and risk zone (9%) fills to the right of entry. **Target tag** "★ TARGET 49.84 · +2R" and **Stop tag** "⛨ STOP 38.80 · −1R": pill labels, radius 4, Chakra Petch 700 11px, dark text on the up/down color. Last price tag 43.17.
    2. **Volume:** bars at 30% opacity; the breakout bar is at 100% with a gold `#F5C542` badge "2.4×". The 10w avg volume is a dashed `#8C88B5` line.
    3. **RS (Mansfield) vs market:** a `#C9C4F5` 1.5px line, a zero line dashed `#33315A`, a red 8% area between the line and zero, and an amber value tag "−0.4".
- **Bottom row:** grid `330px 1fr 250px`, gap 10.
  - *Mentor:* a 56px round portrait placeholder (2px violet ring and glow) with the name "MARGO" below. The speech bubble has bg `#1A1930`, radius 8, and a rotated-square tail. Copy: "Nice breakout, 2.4× volume! But RS is still under zero. The big winners usually lead the market first. Check **relative strength**." (The term is an underlined link that opens a lesson.) Pill buttons: "Got it" (violet) and "Teach me · +40 XP".
  - *BATTLE LOG:* header, plus "🔥 DISCIPLINE STREAK ×3" in gold. Rows are 28px, grid `30 44 58 72 50 1fr 50`, nowrap. Columns: #, ticker, ▲ LONG / ▼ SHORT, P&L, R, flag chip, XP. Flag chip colors:
    - good: bg `#153530`, text `#6FE0CF`
    - warn: bg `#33281A`, text `#F2A93B`
    - bad: bg `#3A1A1F`, text `#FF8A8A`

    Rows (verbatim): #14 KRVX S2 BRK live · #13 OMNX PLAN ✓ +60 XP · #12 TALR S3 · LATE +5 XP · #11 BRQE STOP ✓ +20 XP · #10 VANT S4 BUY ✕ 0 XP.
  - *SIDE QUESTS:* checkbox rows. Done items get a filled up-color box and strikethrough text. Quests: Buy a Stage 2 breakout (+50, done) · Risk ≤ 1% on 5 trades (3/5) · Trail a winner to +2R (+80) · No Stage 4 buys this week (+40).

*Right column: Loadout (330px, flex column, gap 10).*
- **CALL THE STAGE:** 4 cards, 54px tall, radius 5, each with a 30×14 polyline glyph and a label (1 BASE / 2 ADVANCE / 3 TOP / 4 DECLINE). The selected card has bg `#1E1A40`, white text, and a `gGlow` 2s pulse; unselected cards have bg `#1A1930`, text `#6E6A96`. Hint: "right call +30 XP".
  - SETUP rating: 4 stars, filled `#F5C542`, empty `#33315A`, "3 / 4".
  - A 2-column checklist: ✓ Above 30w MA · ✓ 30w MA rising · ✓ Volume 2.4× · ✕ RS below 0 (amber).
- **LOADOUT:**
  - BUY/SHORT segmented toggle.
  - "Risk per trade 1.0% · $1,026", with a 5-step risk meter covering 0.5–2.5%.
  - Stop / Target tiles: "Stop · −1R 38.80" and "Target · +2R 49.84".
  - "Size 278 sh".
  - "If stopped out −$1,023 · −10 HP".
- **Action buttons:**
  - BUY: 50px tall, `linear-gradient(180deg,#34C2B3,#26A69A)`, text `#04201D`, Chakra Petch 700 17px +0.08em. Keycap "B". Animation `gBuy` 2.2s (glow pulse plus a 4px bottom "3D" shadow `#0F5A53`).
  - SELL [S] and FLATTEN [F]: 36px tall, bg `#1A1930`.
- **ACTIVE position card:** gradient `135deg #0F2A27 → panel`, border `#1F4F49`. Shows "LONG 278 KRVX @ 42.48", "+$192 ▲", "+0.19R", and an R-progress bar running from stop (−1R) to target (+2R): the entry tick is at 33.3%, the fill is the current R, and a ★ sits at the target end.

**Variant: no stop (prop `noStop`)**
- The Stop tile becomes a dashed red box reading "NONE".
- The risk line is replaced by an alert box: bg `#2A0F16`, 1px `#EF5350` border, pulsing brightness 1.2s. It reads "⚠ NO SHIELD · −∞ HP" and "Without a stop, one bad day can end your run."
- The chart loses the stop tag and the risk zone.

**Variant: colorblind (prop `colorblind`)**
- Up changes to `#4C9AFF` and down to `#FF8A3D`. This is implemented via CSS vars `--up` and `--down` on the root.

**Numbers are internally consistent:**
- Equity $102,601.82 × 1% ≈ $1,026 risk.
- Stop distance 42.48 − 38.80 = 3.68, so 278 shares, and the actual risk is $1,023.
- Target = entry + 2R = 49.84.
- Open P&L = (43.17 − 42.48) × 278 = $191.82, which is +0.19R.

### 02: Challenge Failed / Post-mortem (v2 styling; apply the v3 treatment)
- **Header:** hatched red "LIMIT BREACHED" bar, then "Challenge failed: Max daily loss breached" (34px/700), then "Week 6 · Tue · 14:20 · Final equity $94,870.00 · Day −5.2% ▼ vs limit −5.0%". Side note: "Most funded traders fail a challenge first. This run tells you exactly why."
- **WHAT HAPPENED:** 3 causal cards connected by arrows, plus a concepts card.
  1. #22 OMNX, −1.8%, a failed Stage 2 breakout, stopped as planned (flag "Followed plan").
  2. #23 VANT, 3× size, bought below a falling 30-wk MA with RS −4.1 (flag "Revenge trade · Stage 4 entry"; amber card `#17140F` / `#5A4020`).
  3. #23, −3.4%, no stop, broke the prior low (flag "Limit breached"; red card `#1A1113` / `#5A2427`).

  Concepts card (violet `#14132A` / `#3A3268`): Position sizing · Revenge trading · Never buy Stage 4 · "3 short lessons · 6 min".
- **Equity curve:** the full run over W1–W6 with 23 trade dots (green for wins, red for losses), a dashed start line at 100k, and a daily-limit line. Behind it, the **revealed stage bands** of the TYX index: Stage 2 Advance `#16302C`, Stage 3 Top `#2B2718`, Stage 4 Decline `#321A1C`. The final trade #23 is circled in red.
- **Stats grid (2 columns):** Win rate 58% · Trades 23 · Avg win +0.9R · Avg loss −1.4R · Expectancy −0.07R (highlighted) · Profit factor 0.91 · Max DD −5.1% · Stage 2 entries 9/23 ("6 entries in Stage 4").
- **Buttons:** **Retry with new seed ↵** (primary, violet) · Replay this run (outline) · Back to career (text). Hint: "Replay uses seed 48213 · same market, same stages".
- *Game treatment to add:* show the XP earned this run even on failure, and show "HP 0" on the breached bar.

### 03: Challenge Briefing (v2 styling; apply the v3 treatment)
- Centered 760px column.
- Eyebrow "BRIEFING · PHASE 1". Title "Prove you can grow an account without blowing it up." Sub: "Find stocks entering Stage 2 and hit the profit target before the weeks run out. Break either loss limit and the run ends on the spot."
- **Rules table.** Each row has a colored bullet, the rule, a value, and one sentence on why the rule exists:
  - Starting account $100,000
  - Profit target +10%
  - Max daily loss −5%
  - Max total loss −10%
  - Min trading weeks 4
  - Max trading weeks 10
- **Info strip:** Universe "12 fictional stocks · TYX index" · Timeframes "W · D · 65m" · Tools "MA 10/30w · Volume · RS".
- **Seed field:** Random / Custom segmented control, then the seed input "48213 ↻". **Start challenge ↵** button (48px, violet).
- **Disclaimer:** "Educational game. Fictional markets, no real money, not financial advice."

### 04: The Terminal Grows (progression concept)
- Two 16:10 terminal thumbnails side by side.
  - **Retail (start):** 3 panels. One weekly chart with the 30w MA, Buy/Sell, and the balance. Lots of empty space.
  - **Scaling (late):** 11 panels. Watchlist (ticker · stage · RS), main W chart with MA/Vol/RS, D and 65m mini charts, Sector RS bars, Breadth "% > 30w MA 64%", positions, stage alerts, firm capital ($4.82M), and the 4 HP/progress bars.
- Caption: "Every unlock adds a panel. Your terminal is your progress."
- Unlock chips: Phase 2 · Sector RS, Breadth / Phase 3 · Watchlist, Daily + 65m / Firm · Stage scanner, Desks.

### 05: Design Tokens
This is the token sheet. It covers surfaces, semantic colors with the colorblind variant, chart-study styles, stage bands, the type scale, spacing, radii, and health-bar states. Values are listed below.

---

## Interactions & Behavior
- **Keyboard:**
  - `B` buy, `S` sell/short, `F` flatten
  - `Space` pause
  - `1`/`2`/`5` set speed
  - `Enter` confirms on the briefing and failed screens
- **Playback:** the sim advances bar by bar at 1×/2×/5×. "Next day ▸" skips to the next daily close.
- **Timeframes:** W is the default. D and 65m are unlocked in Phase 3 (see screen 04); in M0, show them as available toggles only if the sim supports them.
- **Chart:**
  - stop and target lines are **draggable**; dragging updates the loadout fields, the R values, the size and the HP-cost preview live
  - the player can draw a horizontal resistance/support line (violet dashed)
  - the chart header shows current values for the 10w and 30w MAs, plus a slope arrow for the 30w
- **Stage call:** selecting a card is required before Buy is enabled. The setup rating recomputes automatically from 4 checks:
  - price > 30w MA
  - 30w MA slope over 4 weeks > 0
  - breakout volume ≥ 2× the 10w avg
  - RS > 0
- **Position sizing:** qty = floor(equity × risk% / |entry − stop|). If there is no stop, risk = ∞ and the NO SHIELD warning shows.
- **HP:** HP bars drain as losses accrue. States:
  - safe: > 60% left, gray
  - warning: 60–30% left, amber
  - critical: < 30% left, red with a 1s pulse
  - breached: 0, red hatched stripes; the run ends and the game routes to screen 02
- **XP:** awarded for process, not P&L: followed plan, stop respected, correct stage call, completed quest. Show it as a floating "+N XP" toast (`gFloat`, 3s ease-out: fade in and rise −10px). The Battle log records XP per trade.
- **Mentor:** one line per trigger. Rule-based triggers include: RS < 0 on entry, size larger than the last trade, no stop, and a buy in Stage 3 or 4. The underlined term opens a lesson; "Teach me" grants XP after the lesson.
- **Animations** (all ease-in-out, infinite unless noted):
  - `gPulse` opacity 1 → .45 → 1 (current week pip 1.4s, Account HP number 1.8s)
  - `gWarn` brightness 1 → 1.35 → 1 (Account HP bar 1.8s, NO SHIELD box 1.2s)
  - `gGlow` violet ring glow (selected stage card 2s)
  - `gBuy` green glow (Buy button 2.2s)
  - `gFloat` for XP toasts

  Respect `prefers-reduced-motion` by disabling all of them.

## State Management
- `run`: seed, phase, week (1–10), day, clock, speed, paused
- `account`: startBalance 100000, balance, equity, openPnL, dayStartEquity, peakEquity
- `limits`: dailyLossPct 5, maxLossPct 10, targetPct 10, minWeeks 4, maxWeeks 10. Derived: dailyHP, accountHP, targetProgress.
- `market`: tickers[], bars per timeframe (W/D/65m), indicators per bar (ma10, ma30, avgVol10, rsMansfield), and the hidden `stage` per bar (revealed on the post-mortem)
- `order`: side, type (market/limit/stop), riskPct, stop, target, qty (derived), stageCall, setupChecks (derived)
- `positions[]`, `trades[]`: each trade has id, ticker, side, qty, entry, exit, pnl, r, stageAtEntry, flags[], xp
- `player`: level, xp, xpToNext, streak, quests[]
- `settings`: colorblind, reducedMotion
- **Transitions:** a limit breach triggers the failed screen with a causal chain built from the trades[] flags. A target hit after the minimum number of weeks means pass (not designed yet).

## Design Tokens
**Surfaces (v3 game)**
- bg `#0A0B12`; top glow `#141630` (radial)
- panel `#111220` at 60% opacity (`#11122099`); chart panel `#0C0D18`
- raised/button `#1A1930`; selected `#1E1A40`
- border `#23254A`; divider `#1B1C33`; grid lines `#15162A`

**Surfaces (v2 terminal, screens 02–05)**
- bg `#0B0E11`, panel `#0E1216`, raised `#11161B`, border `#1E242C`

**Text**
- primary `#E6E8F0`, secondary `#C9C4F5`, muted `#8C88B5`, dim `#6E6A96`, disabled `#4E4B78`
- v2 equivalents: `#E4E7EB` / `#9AA3AE` / `#7D8794` / `#5E6873`

**Semantic colors** (strict meaning, never decorative; always paired with a sign and ▲/▼)
- up/profit `#26A69A` (colorblind `#4C9AFF`); buy gradient top `#34C2B3`, 3D shadow `#0F5A53`
- down/loss `#EF5350` (colorblind `#FF8A3D`)
- risk ramp `#7D8794` → `#F2A93B` → `#F2703B` → `#EF5350` (colorblind `#F2D03B` → `#E05BB8` → `#D6336C`)
- damage track `#2A1520`
- accent (interactive, XP) `#8F7EF3`; light `#B3A6FF`; deep `#5B4BC4`
- reward/stars/streak `#F5C542`

**Chip colors**
- good: bg `#153530`, text `#6FE0CF`
- warn: bg `#33281A`, text `#F2A93B`
- bad: bg `#3A1A1F`, text `#FF8A8A`

**Stage bands** (post-mortem only)
- Stage 1 `#1B2029`
- Stage 2 `#16302C`
- Stage 3 `#2B2718`
- Stage 4 `#321A1C`

**Chart studies**
- 30w MA: `#E6E8F0` 2.25px, plus a violet glow underlay
- 10w MA: `#6E6A96` 1.25px
- avg volume: dashed 3 2, `#8C88B5`
- RS line: `#C9C4F5` 1.5px; zero line dashed `#33315A`
- player drawings: violet, dashed 6 3

**Type**
- Display/HUD labels: **Chakra Petch** 600/700, uppercase, letter-spacing +0.04 to +0.18em
- Numbers: **JetBrains Mono** with tabular-nums
- Prose: **Inter** 400–600

**Type scale**
- 34 display
- 24 bankroll
- 18–20 HUD values
- 16 ticker
- 13–14 body/mentor
- 12 UI
- 11 small
- 10 captions/labels

**Spacing:** 2px base: 2, 4, 6, 8, 10, 12, 14, 16, 24, 32, 48. Screen gutter 16; panel gap 10; card padding 10–14.

**Radii**
- 2: segments, chips
- 3–4: buttons, inputs, tags
- 5–6: cards, panels
- 8: speech bubble
- 12: pill buttons

**Shadows/glows**
- badge `0 0 16px rgba(143,126,243,.5)`
- XP bar `0 0 8px #8F7EF3`
- stage card `0 0 0 1px rgba(143,126,243,.5..0.9), 0 0 18..28px rgba(143,126,243,.25..0.45)`
- Buy `0 4px 0 #0F5A53` plus a pulse up to `0 0 22px 2px rgba(38,166,154,.35)`

## Assets
- **Fonts** (Google Fonts): Chakra Petch 500/600/700, Inter 400–700, JetBrains Mono 400–700.
- **Mentor portrait "Margo":** a placeholder (striped circle). It needs real illustrated art.
- **Icons:** currently Unicode glyphs (♥ ⛨ ★ 🔒 🔥 ▲ ▼ ✓ ✕ ❚❚ ▸) and CSS shapes (diamond, hexagon shield). Replace them with a consistent icon set in the codebase. The 4 stage glyphs are simple 30×14 polylines and can stay as SVG.
- All tickers (KRVX, OMNX, TALR, BRQE, VANT…) and the TYX index are **fictional**.

## Files
- `01 Trading Screen v3 Game.dc.html`: **primary**, the approved game direction (props `colorblind`, `noStop`)
- `02 Challenge Failed v2.dc.html`: post-mortem (prop `colorblind`); restyle to v3
- `03 Challenge Briefing v2.dc.html`: briefing; restyle to v3
- `04 Terminal Grows v2.dc.html`: progression concept
- `05 Design Tokens v2.dc.html`: token sheet (v2 palette plus the stage-analysis additions); v3 game tokens are listed in this README
- `reference/01 Trading Screen v2.dc.html`: sober terminal version of screen 1, for reference
- `support.js`: preview runtime only, so the `.dc.html` files open in a browser. Do not port it.

## Open items
- **Fundamental analysis:** not designed yet. Proposed as a Phase 2 unlock: a company card with EPS/revenue growth, earnings events with gaps, and fundamental checks added to the setup rating.
- **Challenge passed** screen: not designed.
- The v3 game treatment still needs to be applied to screens 02–05.
