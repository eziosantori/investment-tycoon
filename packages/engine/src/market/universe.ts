import type { StageCycleParams } from './params';
import type { Cents, InstrumentInfo, Shares, Ticker } from './types';

/** One instrument of the universe as defined in the universe data (`../universe.ts`). */
export interface InstrumentSpec {
  ticker: Ticker;
  name: string;
  /** Sensitivity to index returns, 0.7–1.6 for stocks; 1 for the index. */
  beta: number;
  startPrice: Cents;
  /** Average volume per 65m bar. */
  baseVolume: Shares;
  /** Multiplier on the instrument's volatility. */
  volScale: number;
  /** Overrides the kind's stage cycle (`MARKET_PARAMS`) for this instrument only. */
  stageCycle?: StageCycleParams;
}

export function infoOf(spec: InstrumentSpec, kind: InstrumentInfo['kind']): InstrumentInfo {
  return { ticker: spec.ticker, name: spec.name, kind, beta: spec.beta };
}
