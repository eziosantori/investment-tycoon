import { describe, expect, it } from 'vitest';
import { hpFromLoss, hpState } from '../game/hp';
import { money, rMultiple, signedMoney, signedPct, splitMoney } from './format';

describe('format', () => {
  it('formats money with grouping and a real minus sign', () => {
    expect(money(1026.4)).toBe('$1,026');
    expect(money(-1023)).toBe('−$1,023');
    expect(signedMoney(191.82)).toBe('+$191.82');
    expect(signedMoney(-524.8)).toBe('−$524.80');
  });

  it('splits the bankroll into whole and cents', () => {
    expect(splitMoney(102601.82)).toEqual({ whole: '$102,601', cents: '.82' });
  });

  it('formats signed percentages and R-multiples', () => {
    expect(signedPct(2.6)).toBe('+2.6%');
    expect(signedPct(-4.3)).toBe('−4.3%');
    expect(rMultiple(0.19)).toBe('+0.19R');
    expect(rMultiple(-1)).toBe('−1.00R');
  });
});

describe('hp', () => {
  it('maps losses to HP like the handoff examples', () => {
    expect(hpFromLoss(2.1, 5)).toBe(58);
    expect(hpFromLoss(4.3, 10)).toBe(57);
    expect(hpFromLoss(6, 5)).toBe(0);
  });

  it('classifies HP states', () => {
    expect(hpState(100)).toBe('safe');
    expect(hpState(61)).toBe('safe');
    expect(hpState(58)).toBe('warning');
    expect(hpState(30)).toBe('warning');
    expect(hpState(29)).toBe('critical');
    expect(hpState(0)).toBe('breached');
  });
});
