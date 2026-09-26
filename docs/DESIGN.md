# Design Review & Direction

This document reviews the original brief, pushes back where needed, and sets the
design direction the [roadmap](ROADMAP.md) is built on. The technical side is in
[ARCHITECTURE.md](ARCHITECTURE.md).

---

## 0. Decisions after the mockup (2026-09-26)

The Claude Design handoff (`design/design_handoff_investment_tycoon/`) settled
several open points. Where they conflict with the rest of this document, **this
section wins**:

- **Stage Analysis (Weinstein) is the core technical method.** Tools are the
  30w/10w MAs, volume vs its 10w average, and Mansfield RS vs the index.
  Timeframes are Weekly, Daily and 65m. RSI/MACD are dropped. The player
  **calls the stage** before entering, and the true stages are revealed in the
  post-mortem. This replaces the generic "regimes + indicators" idea of §1.5:
  the hidden regime _is_ the stage cycle, and the edge comes from reading it
  correctly.
- **Visual direction: v3 "game HUD"**, not a sober terminal. XP, levels, HP bars
  for the loss limits, a mission bar, side quests, a battle log, and a mentor
  character (Margo). XP rewards **process** (plan followed, stop respected,
  right stage call), never P&L, which matches §1.10.
- **The prop challenge is the frame for Phase 1**, played on a generated market
  (12 fictional stocks + the TYX index).
- **New mode: the Model Book.** Real historical stocks (CSCO in the dot-com era,
  AAPL, TSLA, …) played as single case files, week by week, with a reveal at the
  end. This becomes Phase 2, and the historical market replays (§1.8) move into
  it. Details and pushback (survivorship bias, data licensing) are in
  [MODEL_BOOK.md](MODEL_BOOK.md).
- The value desk and the firm/AUM layer move to Phase 3; macro stays parked.

One tension to watch: Stage Analysis is a patient, weekly method, and a
10-week challenge with a daily loss limit pushes toward shorter holds. The
12-stock universe helps (rotate into new Stage 2 setups), but playtests should
check that the challenge doesn't reward abandoning the method.

---

## 1. Pushback on the brief

### 1.1 Five campaigns is really three, plus a meta-layer

| Brief item                      | Verdict                                | Why                                                                                                                                                                                                                                     |
| ------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Value investing              | **Keep**, it's a pillar                | It has its own mechanic (investigating) and its own time scale (years).                                                                                                                                                                 |
| 2. Technical trading            | **Merge with 5**                       | It needs a win/lose frame, and the prop challenge _is_ that frame. On its own it's a sandbox with no goal.                                                                                                                              |
| 3. Fundamental + trading hybrid | **Cut as a campaign**, keep as a layer | "Earnings season, guidance surprises, sector rotation" are _events_, not a mechanic. They make the value desk and the trading desk more interesting, but they don't make a third game. Ship them as the shared news/event system (M15). |
| 4. Macro / portfolio            | **Keep, build last**                   | It's a different mechanic (allocation and correlation, not picking), but it's the hardest to make fun (see §4).                                                                                                                         |
| 5. Prop firm challenge          | **Make it the frame for trading**      | Fixed targets, hard drawdown limits, instant clear failure: it's the most "game-native" idea in the brief.                                                                                                                              |

That leaves three desks (**Trading**, **Value**, **Macro**) under one **Firm**
meta-layer (AUM, clients, staff, reputation), plus the **Strategy Builder** as the
endgame automation layer.

### 1.2 The tycoon layer needs a clear job

In Transport Tycoon the fun is going from micromanaging one route to running a
network that works on its own. The investing version of that is **going from
making every decision yourself to building a system that makes them**:

- Early: you click every trade and read every balance sheet.
- Mid: you hire analysts who screen, flag, or run simple rules you set up.
- Late: you design strategies in the node builder and manage the firm's capital
  across desks.

So the Strategy Builder shouldn't show up only at the very end. Simple rule-based
analysts ("alert me when RSI < 30 on a stock I'm watching", "screen for P/B < 1
and D/E < 0.5") should appear mid-game as a light version of it. By the time the
full builder unlocks, the player has already been automating.

The career ladder also gives the tycoon arc a story that fits the trading-first v1:

```
Retail account → Prop challenge → Funded trader → Scaling plan
   → Open your own fund (clients, AUM) → Add desks (Value, Macro) → Quant desk
```

### 1.3 "Positions converge to fair value" is a solved game unless value is uncertain

If cheap stocks reliably converge to a known fair value, the best strategy is
"buy the biggest discount and wait". There are no decisions left to make. To fix it:

- **True intrinsic value is hidden.** The player only ever sees an _estimate_
  built from the statements, and its accuracy depends on how much research they did.
- **Value traps exist.** Some cheap stocks are cheap for a reason (hidden red
  flags), and their intrinsic value _falls_ over time.
- **How fast prices converge is random**, and some convergence waits on catalysts.
  Being right but early is a real, felt cost.
- **Client patience pushes the other way.** Underperform the benchmark for too
  long and clients redeem. The real tension in value investing is _conviction
  vs. career risk_. That's the lesson, and it's also the game.

### 1.4 Don't make players compute ratios by hand

Computing P/E by hand is arithmetic homework, not investing. The skill is
**judgment: which number matters, and what does it mean here?** Instead:

- **Research time is the scarce resource.** Each quarter you get N research hours.
  Opening a company's cash-flow statement, reading the notes, or doing a
  channel check costs hours. You can't look at everything.
- The game calculates ratios for you once the concept is unlocked. The player
  decides **what to look at** and **what to conclude**.
- Red flags show up in **trends across periods** (receivables growing 3× faster
  than revenue), which is where they appear in real life. So the UI emphasizes
  period-over-period diffs and small inline charts, not single numbers.
- The player records a **thesis** ("undervalued because X, sell if Y"). The game
  checks it against what happens later, which gives feedback on reasoning, not
  just on P&L.

### 1.5 Technical analysis on procedural data: an honesty problem

If the price generator is a pure random walk, indicators have zero edge, and the
game quietly teaches that TA doesn't work. If we plant patterns so indicators
_always_ work, we teach something false and dangerous. Resolution:

- The generator has **hidden regimes** (trending, mean-reverting, choppy,
  volatile). Indicators have an edge _only in the matching regime_. Trend tools
  work in trends and bleed in chop. RSI mean-reversion works in ranges and gets
  run over in trends.
- The core skill isn't prediction. It's **risk management plus recognizing when
  you have no edge**. You can pass a prop challenge with a 40% win rate and
  disciplined 1:2 risk/reward. You can blow up with a 70% win rate and no stops.
- Post-game stats (expectancy, R-multiples, win rate by regime) make this
  visible.

### 1.6 A forced stop-loss removes the lesson

The brief says stop-loss is mandatory _and_ that breaking risk rules ends the
run. If the UI forces stops, the player can never make the mistake, so they never
learn why it's a mistake. Instead:

- In the **tutorial/retail stage**, stops are optional. The player is allowed to
  get hurt, and the post-mortem explains exactly how.
- In the **prop challenge**, the firm's rules (max daily loss, max total loss)
  punish bad risk management right away. No stop is forced, but trading without
  one is visibly reckless: the "risk at entry" readout shows `∞`.
- The **position-size calculator** is always one click away (risk % → quantity).
  Using it is a habit the game rewards, not a gate it forces.

### 1.7 The advisor should mostly explain failures, not introduce terms

Popping up an explanation the first time each term appears gets spammy fast, and
players learn to dismiss the popups. The stronger teaching moment comes **right
after a mistake**:

> "You lost 4.1% on one trade. Your stop was 3× wider than usual, but you kept
> the same share size, so the risk per trade tripled. This is what _position
> sizing_ protects against."

So the advisor has two modes:

1. **First-use explanations**: short, one line, dismissable, with the term
   underlined and clickable forever after.
2. **Post-mortems**: triggered by _behavior detectors_ (oversizing, no stop,
   moving the stop further away, revenge trading, averaging down, concentration).
   This is the most important teaching system in the game.

A small **"terms learned" log** (not an encyclopedia, just the terms you've
already met, with links back to the moment you met them) makes an OK review
tool and a mild collection mechanic.

### 1.8 Historical mode: hindsight and data

- **Hindsight bias:** anonymized tickers don't hide a −50% index in 2008-shaped
  data. Mitigations: don't reveal the period until the end, randomize the start
  offset, and use historical data mainly for **backtesting** (endgame), where
  known history is a feature, not a spoiler.
- **Data licensing:** "real data with anonymized names" doesn't remove licensing
  issues. The _price data itself_ can be licensed. Safe sources exist for
  **index-level** data (e.g. Robert Shiller's public S&P dataset, FRED series,
  public-domain Dow history). Single-stock history back to 1929 is hard to get
  cleanly. Plan: real index/sector data, with synthetic "constituents" generated
  to fit it.

### 1.9 Time scales don't mix well

Trading runs on minutes, value investing on quarters, macro on months. Forcing
them onto one real-time clock makes one of them miserable. Each desk runs at
its own granularity, and the **firm layer ticks quarterly** (client reviews,
fees, hiring). When several desks run at once (Phase 3), the trading desk is played
as discrete "sessions" inside the firm's calendar, not as a live background
ticker.

### 1.10 Small but important

- **Educational disclaimer** in-game and in the README: fictional markets, no
  real money, not financial advice.
- **No gambling-style mechanics:** no loot boxes, no spend-to-retry, no streak
  rewards for overtrading. The game shouldn't reward the behavior it's trying to
  teach against.
- **Colorblind-safe P&L colors:** red/green by default, with a blue/orange option.
  Always pair color with a sign (`+`/`−`) and arrows.

---

## 2. Scoped v1: the Prop Challenge (Trading Desk)

**v1 = one instrument, one challenge ruleset, a candlestick chart, stops and
sizing, hard drawdown limits, and a post-mortem that explains how you failed.**

Why this one first:

1. **Smallest vertical slice that's actually a game.** It has a goal (profit
   target), clear failure (drawdown), 15–20 minute sessions, and replay value
   from new seeds. Value investing needs a whole company/statement generator
   before a single decision is possible.
2. **It builds the engine every other desk needs:** seeded market generation, the
   tick loop, order matching, accounting, rule evaluation, events, and the
   advisor hooks. The value desk reuses all of it.
3. **Its failure states are the most genre-native in the brief.** "Max daily loss
   breached" is instantly understood and instantly felt.
4. **Risk management is the most universally useful lesson.** It applies to
   every other style, and it doesn't depend on whether TA "works".
5. **It's the fastest way to find out if the game is fun.** If blowing a
   challenge doesn't make players want to hit "retry" right away, we need to
   know that before building four more modes.

The honest counter-argument is that the value desk is the more _distinctive_
idea: there are plenty of trading sims and very few good value investing games.
That's why it's v2, and why v1's engine is designed with it in mind.

---

## 3. UI / UX direction

**Agree with the dark, data-dense terminal look, with three changes.**

1. **The terminal grows with you.** This is the tycoon visual payoff. At the
   start the screen is nearly empty: one chart, a buy/sell panel, a balance.
   Every unlock (indicators, order types, watchlists, the screener, the
   correlation matrix, analyst panels) adds a _panel_ to the workspace. Seeing
   a sparse screen turn into a full Bloomberg-style wall is the equivalent of
   watching your rail network spread. Progressive disclosure also keeps beginners
   from getting overwhelmed.
2. **Game feel on top of the terminal.** Animated number tickers, the drawdown
   bars styled as health bars that pulse near the limit, subtle sound on fills
   and stop-outs, a big clear pass/fail screen. The terminal is the look; the
   feel is still a game.
3. **One non-terminal screen: the Firm.** A simple, low-detail office or
   org-chart view (desks, staff, clients) for the tycoon layer (M14+). Stylized
   and minimal, not cartoonish, but spatial. Pure spreadsheets make "growing a
   firm" feel abstract.

Visual specifics:

- Monospace with tabular numerals for all numbers (e.g. JetBrains Mono / IBM
  Plex Mono). Sans-serif (e.g. Inter) for prose and advisor text.
- Strict color meaning: P&L up/down, risk (amber → red), neutral data (gray), and
  one accent for interactive elements. Never use color only for decoration.
- Numbers are always formatted consistently: signed P&L, % and $ side by side,
  and R-multiples for trades.
- Keyboard shortcuts for trading (B/S/F to flatten, space to pause), because the
  target audience will want them.

---

## 4. Fun-risk assessment per campaign

| Mode                                | Fun risk       | Main danger                                                                                                                                                             | How to keep it a game                                                                                                                                                                                                                                                     |
| ----------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prop challenge**                  | 🟢 Low         | Grinding sameness across seeds                                                                                                                                          | Regime variety, rulesets (swing/intraday/news-heavy), daily seed, career ladder                                                                                                                                                                                           |
| **Technical trading** (inside prop) | 🟡 Medium      | Teaching false edge; watching candles is tiring                                                                                                                         | Regime-conditional edge (§1.5), speed control and pause, skip-to-next-day                                                                                                                                                                                                 |
| **Value investing**                 | 🟠 Medium-high | Spreadsheet homework; slow feedback                                                                                                                                     | Research-time budget, value traps, thesis checking, time-skip turns, client pressure                                                                                                                                                                                      |
| **Hybrid / earnings**               | ⚪ n/a         | Redundant as a mode                                                                                                                                                     | Becomes the shared event layer                                                                                                                                                                                                                                            |
| **Macro / portfolio**               | 🔴 High        | **Most likely to become a "quiz with a chart on top."** Rules like "rates up → growth down" either get memorized as answers or taught as deterministic laws (both bad). | Build on a factor model where relationships are _probabilistic and regime-dependent_. Frame it as _scenario survival_ ("build a portfolio that survives these 5 hidden scenarios") rather than "predict the Fed". Correlations that break in a crisis are the key moment. |
| **Strategy builder**                | 🟡 Medium      | Niche appeal; overfitting makes everything look great                                                                                                                   | Mandatory in-sample / out-of-sample split. Watching a "perfect" backtest fail out of sample is the best lesson the endgame has.                                                                                                                                           |

**Bottom line:** the prop challenge is naturally fun, value needs careful
design, and macro is the one to treat as a research project. Don't commit to it
until the event layer (M15) and a factor model exist to prototype on.
