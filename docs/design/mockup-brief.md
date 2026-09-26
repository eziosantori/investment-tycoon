# Mockup Brief (for Claude Design)

Paste everything below the line into Claude Design. Iterate there, then export
the result into `design/` in this repo; M0 takes its theme tokens and layout
from it.

---

Design high-fidelity desktop mockups (1440×900) for a browser game called
**Investment Tycoon** (working title). It's an educational trading/investing
tycoon game. In the first mode, the player takes a **prop-firm trading
challenge**: hit a profit target on a simulated market without breaking
drawdown limits. Breaking a limit ends the run immediately.

## Visual direction
- **Dark, data-dense trading terminal** (think Bloomberg / TradingView), but with
  **game feel**: drawdown limits shown as *health bars*, clear pass/fail moments,
  numbers that feel alive. Not cartoonish, not a generic SaaS dashboard.
- Numbers: monospace with tabular figures (JetBrains Mono or IBM Plex Mono).
  Prose/labels: Inter.
- Strict color meaning, never decorative:
  - profit/up `#26A69A`-ish green, loss/down `#EF5350`-ish red
    (also show a colorblind variant: blue up / orange down)
  - risk: amber → red as a limit gets closer
  - neutral data: grays; **one** accent color for interactive elements
- Always pair color with sign and arrows (`+1.2%` ▲, `−0.8%` ▼).
- Background near-black (≈ `#0B0E11`), panels slightly lighter, 1px subtle borders,
  compact spacing, small radii.

## Screen 1: Challenge trading screen (most important)
Layout: top bar, large chart center-left, order panel right, bottom strip.

- **Top bar:** logo/title · "Phase 1 Challenge" · Session **4 / 10** · Seed `48213`
  · playback controls (pause, 1×, 2×, 5×, skip session) · sim clock `Day 4 · 11:35`.
- **Challenge status (prominent, near top):**
  - Profit target: **+3.2% of +10.0%** (progress bar, green)
  - Daily loss: **−2.1% of −5.0%** used (health bar, amber)
  - Max loss: **−4.3% of −10.0%** used (health bar, amber, slightly pulsing)
  - Equity **$103,240.18** · Balance $102,410.00 · Open P&L **+$830.18**
- **Chart:** candlesticks for fictional ticker **KRVX**, 5-minute bars, about one
  and a half sessions visible with an overnight gap between them. An open long
  position: entry marker, **stop-loss line** (red, draggable handle, label
  `SL 41.12 · −1.0R`) and **take-profit line** (green, `TP 44.80 · +2.0R`).
  Volume bars at the bottom. A toggle row for indicators where RSI and MACD are
  shown **locked** (padlock, "unlocks in Phase 2").
- **Order panel (right):**
  - Buy / Sell (Short) toggle, order type (Market / Limit / Stop)
  - **Position size calculator:** Account risk `1.0%` → `$1,032` · Stop distance
    `$0.86` → Quantity **1,200** shares
  - Bracket: stop-loss + take-profit fields, R:R shown `1 : 2.0`
  - "Risk at entry: **$1,032 (1.0%)**" (show a variant where no stop is set:
    risk `∞` in red with a small warning)
  - Big Buy / Sell buttons with keyboard hints (B / S / F = flatten)
- **Open position card:** LONG 1,200 KRVX @ 42.48 · Last 43.17 · +$828 · +0.67R.
- **Bottom strip:** trade log table (time, side, qty, entry, exit, P&L, R,
  small flag icons), and on the left an **advisor line**, one quiet sentence
  with an underlined clickable term, e.g.
  "Your stop is 3× wider than your last trade, but your size is the same.
  That triples your risk. See *position sizing*."

## Screen 2: Challenge failed / post-mortem
- Big, clear, not humiliating header: **"Challenge failed: Max daily loss
  breached"** · Session 6, 14:20 · final equity $94,870.
- **"What happened"**: a short causal chain as 3 connected cards:
  1. Loss of −1.8% on trade #14 (stopped out, fine)
  2. Trade #15 opened 2 bars later at **3× size**, flagged *revenge trade*
  3. No stop on #15; a −3.4% move hit the daily limit
  → "Concept to learn: **position sizing** / **revenge trading**"
- Equity curve for the whole run with trades marked, and the **hidden market
  regimes revealed** as colored bands behind it (Trending up / Range / Volatile).
- Stats grid: win rate 58%, avg win +0.9R, avg loss −1.4R, expectancy −0.07R,
  profit factor 0.91, max drawdown −5.1%, trades 23.
- Buttons: **Retry with new seed** (primary) · Replay this run · Back to career.

## Screen 3: Challenge briefing (start of run)
Rules card: $100,000 account · profit target +10% · max daily loss 5% · max
total loss 10% · min 4 sessions · max 10 sessions. One sentence per rule on why
it exists. Seed field (random / custom). "Start challenge" button. Small
disclaimer: "Educational game. Fictional markets, no real money, not financial
advice."

## Screen 4: "The terminal grows" (progression concept)
Two side-by-side thumbnails of the trading screen:
- **Retail (start):** almost empty: chart, simple buy/sell, balance. Lots of
  calm space.
- **Scaling (late):** dense: multiple chart panels, watchlist, indicators, order
  book-like panel, analyst alerts, firm capital widget.
Caption: "Every unlock adds a panel. Your terminal is your progress."

## Deliverables
- The 4 screens above
- A small **design-token sheet**: colors (with colorblind variant), type scale,
  spacing, radii, and the health-bar component in its states (safe / warning /
  critical / breached)
