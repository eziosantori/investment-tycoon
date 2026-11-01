import type { Concept } from './types';

/** Trading and accounting concepts introduced in M2. Vocabulary follows GLOSSARY.md. */
export const tradingConcepts: Concept[] = [
  {
    id: 'long',
    term: 'Long',
    short: 'Owning shares. A long position profits when the price rises and loses when it falls.',
    long: 'Going long is the ordinary kind of trade: you buy shares at the ask, hold them, and later sell them at the bid. If the price has risen by then, you keep the difference; if it has fallen, you lose it. The most a long position can lose is what you paid, because a price cannot go below zero. A long position is the right tool in Stage 2, when the trend is up. You can hold at most one position per stock, and a sell order can shrink it to flat but never turn it into a short.',
    related: ['short-selling', 'spread', 'realized-vs-open-pnl'],
  },
  {
    id: 'short-selling',
    term: 'Short selling',
    short:
      'Borrowing shares and selling them first, to buy them back later. A short position profits when the price falls.',
    long: 'Selling short means you borrow shares, sell them at the bid, and hope to buy them back cheaper at the ask. The sale proceeds are added to your cash, but you now owe the shares: the position counts against your equity as a liability. If the price falls, you buy back for less and keep the difference. If it rises, you lose, and unlike a long position the loss has no ceiling, because a price can keep climbing. Short selling is for Stage 4, when the trend is down; it unlocks at Lv7. As with a long, one position per stock, and an order may shrink it to flat but never flip it.',
    related: ['long', 'spread', 'realized-vs-open-pnl', 'stage'],
  },
  {
    id: 'spread',
    term: 'Spread',
    short:
      'The gap between the ask you buy at and the bid you sell at. It is the only cost of trading.',
    long: 'Every stock has two prices around the mid: the ask, a little above it, where you buy, and the bid, a little below it, where you sell. The gap between them is the spread, and it is fixed for each stock. There is no commission or fee: the spread is the whole cost. It is why a position is slightly negative right after you open it: you paid the ask but are valued at the mid. A tight spread is cheap to cross; a wide one needs a bigger move before you are ahead, so think twice before trading in and out of a stock with a wide spread.',
    related: ['long', 'short-selling', 'realized-vs-open-pnl'],
  },
  {
    id: 'realized-vs-open-pnl',
    term: 'Realized vs open P&L',
    short:
      'Open P&L is the gain or loss on positions you still hold; realized P&L is what you locked in by closing shares.',
    long: 'Open P&L is the gain or loss of your open positions, valued at the mid against what they cost. It moves with every bar and it is not yours yet: a profit can melt away, and a loss can recover. Realized P&L is the gain or loss you locked in by closing shares, whether by selling a long or buying back a short. It does not change with the price any more. When you close part of a position, that part moves from open to realized and the rest stays open. Watch both: realized P&L is your track record, open P&L is your exposure to what the market does next.',
    related: ['long', 'short-selling', 'spread'],
  },
];
