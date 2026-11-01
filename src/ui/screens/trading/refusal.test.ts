import { describe, expect, it } from 'vitest';
import type { RefusalReason } from '@investment-tycoon/engine';
import { refusalText } from './refusal';

describe('refusalText', () => {
  it('says why an order is refused, in the player’s words', () => {
    expect(refusalText('insufficientBuyingPower')).toBe('Not enough buying power');
    expect(refusalText('notTradable')).toBe('The index is not tradable');
    expect(refusalText('invalidShares')).toBe('Choose a positive number of shares');
  });

  it('has a message for every reason', () => {
    const reasons: RefusalReason[] = [
      'insufficientBuyingPower',
      'shortNotAllowed',
      'crossesZero',
      'marketEnded',
      'notTradable',
      'invalidShares',
      'wrongBar',
      'noPosition',
    ];
    for (const r of reasons) expect(refusalText(r)).toMatch(/\w/);
  });
});
