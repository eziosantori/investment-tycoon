import type { Rng } from '../rng';
import { BARS_PER_SESSION, BARS_PER_WEEK } from './calendar';
import type { PriceParams } from './params';
import type { Bar, Stage } from './types';
import type { InstrumentSpec } from './universe';

/**
 * The price model (M1 spec, "Price model"): an instrument's 65m bars from its
 * weekly hidden stages. Every bar's log return is
 *
 *   beta × index return (stocks only)
 *   + stage drift + mean reversion toward the stage's anchor (Stages 1 and 3)
 *   + Student-t shock × volatility (stage, GARCH-like clustering, intraday U)
 *
 * and each session opens with an overnight gap. Prices are integer cents,
 * volumes integer shares; the series itself is kept in floats so rounding
 * never accumulates.
 */

/** The index's moves, which stocks follow by their beta. */
export interface IndexMoves {
  /** Log return from the previous close to each bar's open (overnight gap; 0 inside a session). */
  gaps: number[];
  /** Log return from each bar's open to its close. */
  moves: number[];
}

export interface PriceSeries {
  bars: Bar[];
  /** This instrument's moves, for the stocks to follow (meaningful for the index). */
  moves: IndexMoves;
}

/** The intraday U shape, normalized so a session's variance is unchanged. */
function normalizedProfile(profile: readonly number[]): number[] {
  const meanSquare = profile.reduce((s, x) => s + x * x, 0) / profile.length;
  return profile.map((x) => x / Math.sqrt(meanSquare));
}

function meanOf(profile: readonly number[]): number {
  return profile.reduce((s, x) => s + x, 0) / profile.length;
}

const cents = (price: number): number => Math.max(1, Math.round(price));

/**
 * Fast draws for the ~66k bars of a market, all from one stream: Box–Muller
 * normals that keep their spare, and Student-t whose chi-square uses the
 * product of uniforms for the even part of `df` (one log instead of `df`
 * normals). Same distributions as `Rng`, in a fraction of the time.
 */
function sampler(rng: Rng) {
  let spare: number | null = null;
  const normal = (): number => {
    if (spare != null) {
      const z = spare;
      spare = null;
      return z;
    }
    const r = Math.sqrt(-2 * Math.log(1 - rng.next()));
    const a = 2 * Math.PI * rng.next();
    spare = r * Math.sin(a);
    return r * Math.cos(a);
  };
  /** Student-t scaled to unit variance; `df` > 2. */
  const studentT = (df: number): number => {
    let product = 1;
    for (let i = 0; i < Math.floor(df / 2); i++) product *= 1 - rng.next();
    let chi2 = -2 * Math.log(product);
    if (df % 2 === 1) chi2 += normal() ** 2;
    return (normal() / Math.sqrt(chi2 / df)) * Math.sqrt((df - 2) / df);
  };
  return { normal, studentT };
}

/**
 * 65m bars for all weeks of `stages`.
 *
 * @param rng the instrument's own `series:<ticker>` stream
 * @param market the index's moves and this stock's beta; `null` for the index itself
 */
export function generatePriceSeries(
  spec: InstrumentSpec,
  stages: readonly Stage[],
  p: PriceParams,
  rng: Rng,
  market: { index: IndexMoves; beta: number } | null,
): PriceSeries {
  if (p.intradayVol.length !== BARS_PER_SESSION || p.intradayVolume.length !== BARS_PER_SESSION) {
    throw new Error(`intraday profiles need ${BARS_PER_SESSION} entries`);
  }
  const volU = normalizedProfile(p.intradayVol);
  const volumeMean = meanOf(p.intradayVolume);
  const barVol = (p.sessionVol * spec.volScale) / Math.sqrt(BARS_PER_SESSION);
  const sessionVol = p.sessionVol * spec.volScale;
  const [hMin, hMax] = p.clustering.range;
  const { normal, studentT } = sampler(rng);

  const bars: Bar[] = [];
  const gaps: number[] = [];
  const moves: number[] = [];

  let close = spec.startPrice; // float price
  let idio = 0; // cumulative idiosyncratic log return
  let anchor = 0; // `idio` at the start of the current stage
  let h = 1; // clustering variance multiplier
  let prevStage: Stage | null = null;

  for (let w = 0; w < stages.length; w++) {
    const stage = stages[w] ?? 1;
    const sp = p.stages[stage];
    if (stage !== prevStage) anchor = idio;
    // #12 hooks the stage signatures in here (breakout/breakdown weeks).
    prevStage = stage;

    for (let k = 0; k < BARS_PER_WEEK; k++) {
      const i = w * BARS_PER_WEEK + k;
      const slot = k % BARS_PER_SESSION;
      const clusterVol = Math.sqrt(h);

      let gap = 0;
      if (slot === 0 && i > 0) {
        gap = normal() * p.overnightGap * sessionVol * sp.vol * clusterVol;
        idio += gap;
      }
      const z = studentT(p.shockDf);
      const sigma = barVol * sp.vol * clusterVol * (volU[slot] ?? 1);
      const move = sp.drift / BARS_PER_WEEK + sp.meanReversion * (anchor - idio) + z * sigma;
      idio += move;
      h = Math.min(
        hMax,
        Math.max(
          hMin,
          1 -
            p.clustering.alpha -
            p.clustering.beta +
            p.clustering.alpha * z * z * h +
            p.clustering.beta * h,
        ),
      );

      const totalGap = gap + (market ? market.beta * (market.index.gaps[i] ?? 0) : 0);
      const totalMove = move + (market ? market.beta * (market.index.moves[i] ?? 0) : 0);
      gaps.push(totalGap);
      moves.push(totalMove);

      const open = close * Math.exp(totalGap);
      const next = open * Math.exp(totalMove);
      const o = cents(open);
      const c = cents(next);
      const high = Math.max(open, next) * Math.exp(Math.abs(normal()) * sigma * p.wick);
      const low = Math.min(open, next) * Math.exp(-Math.abs(normal()) * sigma * p.wick);
      const volume =
        spec.baseVolume *
        sp.volume *
        ((p.intradayVolume[slot] ?? 1) / volumeMean) *
        (1 + p.volumeShock * (Math.abs(z) - 0.8)) *
        Math.exp(normal() * p.volumeNoise);
      bars.push({
        o,
        h: Math.max(o, c, cents(high)),
        l: Math.min(o, c, cents(low)),
        c,
        v: Math.max(1, Math.round(volume)),
      });
      close = next;
    }
  }
  return { bars, moves: { gaps, moves } };
}
