/** Weinstein stages: 1 Base · 2 Advance · 3 Top · 4 Decline. */
export type Stage = 1 | 2 | 3 | 4;

export interface Bar {
  /** Index in its own timeframe (day index for D, week index for W). */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  /** Hidden ground-truth stage at the bar's close. Never shown during play. */
  stage: Stage;
}

export interface WeeklyStudyBar extends Bar {
  ma10: number | null;
  ma30: number | null;
  avgVol10: number | null;
  /** Mansfield relative strength vs the index. */
  rs: number | null;
}

export interface Instrument {
  symbol: string;
  name: string;
  tickSize: number;
}
