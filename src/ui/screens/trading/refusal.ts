import type { RefusalReason } from '@investment-tycoon/engine';

/** How long an engine refusal stays under the order buttons (spec #19: about 3 seconds). */
export const REFUSAL_MS = 3000;

const TEXT: Record<RefusalReason, string> = {
  insufficientBuyingPower: 'Not enough buying power',
  shortNotAllowed: 'Short selling unlocks at Lv7',
  crossesZero: 'Order is larger than the position',
  marketEnded: 'The market has ended',
  notTradable: 'The index is not tradable',
  invalidShares: 'Choose a positive number of shares',
  wrongBar: 'The market moved; try again',
  noPosition: 'No position to flatten',
};

/** Why an order is refused, as the player reads it under the order buttons. */
export function refusalText(reason: RefusalReason): string {
  return TEXT[reason];
}
