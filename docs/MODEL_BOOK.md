# Model Book: Historical Case Files

The Model Book is a collection of real historical stock moves, each played as a
single **case file**: a week-by-week replay where you apply Stage Analysis to
a real chart, then see what it was. The idea follows the "model book" tradition
(study the great winners, and the great failures, until you recognize the
pattern live).

Roadmap: Phase 2, M8–M11.

---

## 1. How a case file plays

1. **Setup.** The replay starts inside the base (Stage 1) or earlier, with ~2
   years of history visible for context (enough for the 30w MA and 52w RS).
2. **Weekly turns.** Advance one week at a time, or autoplay. Drill down to daily
   bars to time an entry. There's no 65m timeframe on real data, because free
   intraday history doesn't go back far enough.
3. **Same tools, same rules** as the challenge: call the stage, loadout with
   stop/target/size, HP limits.
4. **End.** The case ends at a fixed date (after the Stage 4 has played out) or
   when you get knocked out.
5. **Reveal.** Ticker, name and dates are revealed, with a short story ("what
   was happening"), key events on the chart, your trades, and the **rules bot**
   (textbook Weinstein entries and exits) for comparison.

### Blind vs open

| Mode                | What's hidden                                                       | Purpose                                        |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| **Blind** (default) | ticker, name, dates; prices rebased (start = 100); index anonymized | Practice pattern recognition without hindsight |
| **Open**            | nothing                                                             | Study a famous move with full context          |

Blind mode helps with hindsight but doesn't remove it. A 2020 TSLA chart is
recognizable to anyone who watched it. That's acceptable: the score still
depends on _executing_ (entry, stop, sizing, exit), not on knowing the ending.

### Scoring

- **Capture:** % of the Stage 2 move you captured
- **Risk:** max drawdown and HP left
- **Stage calls:** accuracy against a **no-look-ahead classifier** (it uses only
  data up to that week, so the calls are fair). The hindsight stages are shown
  at the reveal.
- **Vs rules bot and vs buy-and-hold.** Beating buy-and-hold on CSCO 1998–2002
  mostly means getting _out_.

---

## 2. Design pushback: survivorship bias

A model book made only of famous winners teaches a dangerous lesson: _every
Stage 2 breakout becomes Cisco_. Real breakouts often fail. So:

- The book mixes **winners, full cycles, and failures** (blue chips that rolled
  over, pandemic darlings that collapsed, breakouts that failed).
- Blind mode can serve **"ordinary" cases** (random stocks and periods picked by
  the data pipeline), where the right play is often a small loss or no trade.
  Cutting a failed breakout at −1R is a win in scoring terms.
- The stage scanner (M8) can find failed breakouts automatically in the dataset:
  "breakout on 2× volume above a rising 30w MA, then back below the base within
  N weeks".

---

## 3. First candidate list (to verify against data)

Periods and moves are **approximate from memory** and must be checked against
the actual data in M8 before writing the case story. Prices are pre-split
where noted; the game uses split-adjusted data.

### Great advances (Stage 2)

| #   | Ticker                         | Period      | What it teaches                                                                                                                                               |
| --- | ------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **CSCO** Cisco                 | 1998 → 2002 | The full cycle: long Stage 2, a Stage 3 top in 2000, and a Stage 4 of roughly −85/−90%. The dot-com template. Exiting on the 30w MA break was the whole game. |
| 2   | **QCOM** Qualcomm              | 1999 → 2000 | A near-vertical 1999 advance (one of the era's biggest single-year moves). Climax runs: when to trail, when the stop gets too far away.                       |
| 3   | **AAPL** Apple                 | 2004 → 2009 | A multi-year Stage 2 with successive bases (iPod, then iPhone), a sharp 2008 Stage 4, then a new base and Stage 2 in 2009.                                    |
| 4   | **GOOG** Google                | 2004 → 2008 | Post-IPO base and advance to the 2007 peak, then a 2008 Stage 4. IPO bases.                                                                                   |
| 5   | **HANS / MNST** Hansen Natural | 2003 → 2006 | A classic model-book stock: a small, unknown company, huge earnings growth, huge Stage 2.                                                                     |
| 6   | **TSLA** Tesla                 | 2019 → 2022 | A multi-year Stage 1 base, breakout in late 2019, parabolic 2020, top in late 2021, Stage 4 in 2022.                                                          |
| 7   | **NVDA** Nvidia                | 2016 → 2019 | A leader's Stage 2, then the late-2018 Stage 4 (roughly halved). A great stock is not always a great hold.                                                    |
| 8   | **NVDA** Nvidia                | 2022 → 2024 | A Stage 4 → Stage 1 → the AI-era Stage 2. Nice to pair with #7.                                                                                               |

### Full cycles & collapses (Stage 3 → 4)

| #   | Ticker                  | Period      | What it teaches                                                                                                   |
| --- | ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| 9   | **AMZN** Amazon         | 1998 → 2002 | A giant 1998–99 advance, then a >90% Stage 4, even though the business survived. "Great company" ≠ "buy the dip". |
| 10  | **NFLX** Netflix        | 2010 → 2012 | A strong Stage 2 into mid-2011, then a news-driven (Qwikster) collapse. Stage 3 into a gap-down Stage 4.          |
| 11  | **ZM** Zoom             | 2019 → 2022 | A pandemic Stage 2 to a late-2020 peak, then a long, deep Stage 4.                                                |
| 12  | **PTON** Peloton        | 2020 → 2022 | Same pandemic story, even deeper decline. Averaging down as a trap.                                               |
| 13  | **C** Citigroup         | 2006 → 2009 | A blue-chip bank in Stage 4 through the financial crisis. Averaging down and "it's too big to fall".              |
| 14  | **GE** General Electric | 2016 → 2018 | A slow, grinding Stage 4 in a "safe" blue chip. Not all collapses are fast.                                       |
| 15  | **MSTR** MicroStrategy  | 1999 → 2001 | A dot-com climax and a near-total collapse.                                                                       |
| 16  | **SMCI** Super Micro    | 2023 → 2024 | A recent AI-era climax run, then a sharp Stage 4.                                                                 |

### Index-level replays (M11)

| Period            | Series                       | Notes                                                          |
| ----------------- | ---------------------------- | -------------------------------------------------------------- |
| 1929 crash        | Dow Jones Industrial Average | Index only; single stocks from 1929 are hard to source cleanly |
| 1987 Black Monday | S&P 500 / Dow                | One-day crash inside a Stage 2; market stage vs stock stage    |
| 2000 dot-com top  | Nasdaq Composite / S&P 500   | Pairs with CSCO / QCOM / AMZN                                  |
| 2008 GFC          | S&P 500                      | Pairs with C                                                   |
| 2020 COVID        | S&P 500                      | Fastest bear market; V-shaped Stage 1 → 2                      |

**Data caution:** delisted names (Lucent, Enron, Lehman, Nortel…) would be great
failure cases but are usually missing from free data sources. Adding them
depends on the provider chosen.

---

## 4. Suggesting a case

Cases are content files, not code. To add one, copy the template and run the
validator (M10):

```jsonc
// content/casefiles/csco-1998.json
{
  "id": "csco-1998",
  "ticker": "CSCO",
  "name": "Cisco Systems",
  "benchmark": "SPX", // index for Mansfield RS
  "historyStart": "1996-01-01", // context shown before play starts
  "playStart": "1998-01-05",
  "playEnd": "2002-12-31",
  "category": "full-cycle", // advance | full-cycle | collapse | failed-breakout | market
  "difficulty": 2, // 1–3
  "lessons": ["stage3-top", "exit-on-30w-break", "stage4-no-bottom-fishing"],
  "keyEvents": [{ "date": "2000-03-27", "label": "Peak market cap" }],
  "story": "Short 'what was happening' text shown at the reveal.",
  "referenceMarks": {
    // hindsight annotations shown at the reveal
    "base": ["1998-01-05", "1998-10-12"],
    "breakout": "1998-10-19",
    "top": "2000-03-27",
    "breakdown": "2000-09-25",
  },
  "suggestedBy": "ezio",
}
```

Dates above are placeholders to show the format. Real values come from the data.

---

## 5. Data sources & licensing

Real price data is the main risk for this phase. Summary (not legal advice):

| Option                                                                        | Cost                           | Good for                           | Caveat                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| Free sources (Stooq CSV, Yahoo via yfinance, Tiingo/Alpha Vantage free tiers) | Free                           | **Development and private builds** | Terms generally forbid redistribution; you can't ship this data in a public game |
| Paid EOD provider with display/redistribution rights                          | Tens of $/month and up, varies | **Public release**                 | Check each provider's terms for "display in an application"                      |
| Player brings their own CSV                                                   | Free                           | Fallback                           | Worse UX; fine as an "import your own case" feature                              |
| Index-level public data (Shiller S&P dataset, FRED)                           | Free                           | M11 index replays                  | Monthly/daily granularity varies by series                                       |

Plan:

- **The GitHub repo is public, so real price data is never committed.** Only
  case metadata (`content/casefiles/*.json`) lives in git. The price data is
  fetched locally by `scripts/fetch-case` into `content/casefiles/data/`, which
  is gitignored.
- **Develop with free data, keep real-data content behind a private build flag**
  (M8), so public deploys never include it.
- Decide on a licensed provider before the first public release of Phase 2.
- Store only what the game needs (split-adjusted daily OHLCV + volume, weekly
  aggregates), in compact JSON.
