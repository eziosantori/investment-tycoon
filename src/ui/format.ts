/** Unicode minus: aligns with + in monospace and reads better than a hyphen. */
export const MINUS = '−';

const sign = (x: number) => (x < 0 ? MINUS : '+');

const grouped = (x: number, decimals: number) =>
  Math.abs(x).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

/** 102601.82 → { whole: "$102,601", cents: ".82" } for the bankroll display. */
export function splitMoney(x: number): { whole: string; cents: string } {
  const [whole = '0', cents = '00'] = grouped(x, 2).split('.');
  return { whole: `${x < 0 ? MINUS : ''}$${whole}`, cents: `.${cents}` };
}

/** 1026.4 → "$1,026"; with decimals: "$1,026.40". */
export function money(x: number, decimals = 0): string {
  return `${x < 0 ? MINUS : ''}$${grouped(x, decimals)}`;
}

/** 191.82 → "+$191.82"; −524.8 → "−$524.80". */
export function signedMoney(x: number, decimals = 2): string {
  return `${sign(x)}$${grouped(x, decimals)}`;
}

/** 2.6 → "+2.6%"; −4.3 → "−4.3%". */
export function signedPct(x: number, decimals = 1): string {
  return `${sign(x)}${grouped(x, decimals)}%`;
}

/** 0.19 → "+0.19R". */
export function rMultiple(x: number, decimals = 2): string {
  return `${sign(x)}${grouped(x, decimals)}R`;
}

export function price(x: number, decimals = 2): string {
  return grouped(x, decimals);
}

export const arrow = (x: number) => (x < 0 ? '▼' : '▲');
