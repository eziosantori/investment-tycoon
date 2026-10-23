import type { Concept } from './types';

/** Stage Analysis concepts introduced in M1. Vocabulary follows GLOSSARY.md. */
export const marketConcepts: Concept[] = [
  {
    id: 'stage',
    term: 'Stage',
    short:
      'Where a stock is in its price cycle: 1 Base, 2 Advance, 3 Top or 4 Decline. Buy in Stage 2, never in Stage 4.',
    long: 'Weinstein noticed that stocks move through the same four stages again and again. In Stage 1 (Base) the price goes sideways after a fall, and the 30-week MA flattens out. In Stage 2 (Advance) the price breaks out of the base and climbs above a rising 30-week MA: this is the only stage worth buying. In Stage 3 (Top) the climb stalls, the price chops around a flattening average, and smart money sells. In Stage 4 (Decline) the price falls below a falling 30-week MA; however cheap it looks, it can get cheaper. Before every trade you make a stage call: say which stage you think the stock is in, and why.',
    related: ['30-week-ma', 'trend', 'relative-strength', 'volume-confirmation'],
  },
  {
    id: '30-week-ma',
    term: '30-week MA',
    short:
      'The average closing price of the last 30 weekly bars. Its slope, and which side of it the price is on, tell you the stage.',
    long: 'The 30-week moving average adds up the closes of the last 30 weeks and divides by 30, so each week the oldest close drops out and the newest one comes in. It smooths out the noise and shows the bigger picture. Look at two things. First, its slope: rising, flat or falling. Second, where the price is: above or below it. Price above a rising average is Stage 2; price below a falling average is Stage 4; a flat average with the price crossing back and forth is a base or a top. The average only moves when a week closes, so the forming bar does not count yet.',
    related: ['stage', 'trend'],
  },
  {
    id: 'relative-strength',
    term: 'Relative strength',
    short:
      'How a stock is doing compared with the TYX index. Above zero, the stock is beating the index; below zero, it is lagging.',
    long: "Relative strength (RS) compares a stock with the index (TYX). The game uses Mansfield RS: it divides the stock's price by the index's price, then measures that ratio against its own 52-week average. The result is a line around zero. Above zero, the stock has been doing better than the index; below zero, worse. It does not tell you whether the stock went up; it tells you whether it went up more, or fell less, than the index. Weinstein's advice: when you buy a Stage 2 breakout, prefer stocks whose RS is above zero and rising, because leaders tend to keep leading. A stock with weak RS can still rise with a strong index, but it is often the first to fall when the index turns.",
    related: ['stage', 'trend'],
  },
  {
    id: 'volume-confirmation',
    term: 'Volume confirmation',
    short:
      'A breakout counts when volume is well above its 10-week average. Low-volume breakouts often fail.',
    long: 'Volume is the number of shares traded in a bar. When a stock breaks out of a Stage 1 base, look at the volume bar under it: a real breakout usually comes with volume at least twice its 10-week average, because many buyers are stepping in at once. If the price pokes above the base on thin volume, few people believe in the move, and it often falls back into the base: a failed breakout. Volume also matters on the way down: a breakdown into Stage 4 is dangerous even on light volume, so do not wait for a big volume bar before you sell.',
    related: ['stage', 'trend'],
  },
  {
    id: 'trend',
    term: 'Trend',
    short:
      'The general direction of price over weeks: up, sideways or down. Trade with it, not against it.',
    long: 'A trend is the direction price keeps going over many weeks, not over a single bar. An uptrend makes higher highs and higher lows; a downtrend makes lower highs and lower lows; a sideways market stays in a range. The slope of the 30-week MA is the simplest way to read it. Each stage has its own trend: up in Stage 2, down in Stage 4, sideways in Stages 1 and 3. Check the trend of the TYX index too: most stocks follow it, so buying while the index is in Stage 4 means fighting the tide.',
    related: ['stage', '30-week-ma', 'relative-strength'],
  },
];
