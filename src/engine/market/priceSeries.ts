import type { Rng } from '../rng';
import { BARS_PER_SESSION, BARS_PER_WEEK } from './calendar';
import type { PriceParams, SignatureParams } from './params';
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
 * and each session opens with an overnight gap. The stage signatures (M1 spec,
 * "Stage signatures") then shape the transition weeks: breakouts and
 * breakdowns close past their level on heavy volume, sometimes on a gap, and
 * failed breakouts sink back into their base. Prices are integer cents,
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

/** What a week does at a stage transition (see `SignatureParams`). */
type WeekRole = 'plain' | 'breakout' | 'followThrough' | 'failing' | 'failedLast' | 'breakdown';

/** Index of the first week after `w` whose stage differs from `stages[w]`, or the length. */
function runEnd(stages: readonly Stage[], w: number): number {
  let e = w;
  while (e < stages.length && stages[e] === stages[w]) e++;
  return e;
}

/** Week `w` is in a Stage 2 that came out of a Stage 1 and falls back into one. */
function inFailedAdvance(stages: readonly Stage[], w: number): boolean {
  if (stages[w] !== 2) return false;
  let s = w;
  while (s >= 0 && stages[s] === 2) s--;
  return s >= 0 && stages[s] === 1 && stages[runEnd(stages, w)] === 1;
}

function roleOf(stages: readonly Stage[], w: number, followWeeks: number): WeekRole {
  const stage = stages[w];
  const prev = w > 0 ? stages[w - 1] : undefined;
  if (stage === 4 && (prev === 1 || prev === 3)) return 'breakdown';
  if (stage !== 2) return 'plain';
  const failed = inFailedAdvance(stages, w);
  if (prev === 1) return 'breakout';
  if (failed) return stages[w + 1] === 1 ? 'failedLast' : 'failing';
  for (let d = 1; d <= followWeeks; d++) {
    if (stages[w - d] === 1) return 'followThrough';
    if (stages[w - d] !== 2) break;
  }
  return 'plain';
}

/**
 * 65m bars for all weeks of `stages`.
 *
 * Each week is drafted first (shocks, gaps, raw volume), then its stage
 * signature shapes it: a breakout or breakdown week may open on a gap and is
 * tilted so it closes past its level (as is the last week of a failed
 * breakout, back below resistance), and the week's volume is rescaled to the
 * signature's multiple of the previous 10 weeks' average.
 *
 * @param rngs the instrument's own `series:<ticker>` and `signatures:<ticker>` streams
 * @param market the index's moves and this stock's beta; `null` for the index itself
 */
export function generatePriceSeries(
  spec: InstrumentSpec,
  stages: readonly Stage[],
  params: { price: PriceParams; signatures: SignatureParams },
  rngs: { series: Rng; signatures: Rng },
  market: { index: IndexMoves; beta: number } | null,
): PriceSeries {
  const { price: p, signatures: sig } = params;
  if (p.intradayVol.length !== BARS_PER_SESSION || p.intradayVolume.length !== BARS_PER_SESSION) {
    throw new Error(`intraday profiles need ${BARS_PER_SESSION} entries`);
  }
  const volU = normalizedProfile(p.intradayVol);
  const volumeMean = meanOf(p.intradayVolume);
  const barVol = (p.sessionVol * spec.volScale) / Math.sqrt(BARS_PER_SESSION);
  const sessionVol = p.sessionVol * spec.volScale;
  const [hMin, hMax] = p.clustering.range;
  const { normal, studentT } = sampler(rngs.series);
  const draw = (r: readonly [number, number]) => rngs.signatures.range(r[0], r[1]);

  const bars: Bar[] = [];
  const gaps: number[] = [];
  const moves: number[] = [];
  const weekVolumes: number[] = [];

  let close = spec.startPrice; // float price
  let idio = 0; // cumulative idiosyncratic log return
  let anchor = 0; // `idio` the stage's mean reversion pulls toward
  let baseAnchor = 0; // `idio` at the start of the current base
  let h = 1; // clustering variance multiplier
  let prevStage: Stage | null = null;
  // Levels of the current base and top: weekly closes, in cents.
  let baseHigh = -Infinity;
  let baseLow = Infinity;
  let topLow = Infinity;

  // One week's draft, reused.
  const gapOf = new Array<number>(BARS_PER_WEEK).fill(0);
  const moveOf = new Array<number>(BARS_PER_WEEK).fill(0);
  const sigmaOf = new Array<number>(BARS_PER_WEEK).fill(0);
  const volumeOf = new Array<number>(BARS_PER_WEEK).fill(0);

  for (let w = 0; w < stages.length; w++) {
    const stage = stages[w] ?? 1;
    const role = roleOf(stages, w, sig.breakout.followWeeks);
    const sp = p.stages[stage];
    if (stage !== prevStage) {
      // A failed breakout resumes its base: same anchor, same levels.
      const resumesBase = stage === 1 && prevStage === 2 && inFailedAdvance(stages, w - 1);
      if (stage === 1 && !resumesBase) {
        baseAnchor = idio;
        baseHigh = -Infinity;
        baseLow = Infinity;
      }
      if (stage === 3) topLow = Infinity;
      anchor = stage === 1 ? baseAnchor : idio;
    }
    prevStage = stage;
    let drift = sp.drift;
    let meanReversion = sp.meanReversion;
    if (role === 'failing' || role === 'failedLast') {
      drift = 0;
      meanReversion = sig.failedBreakout.pull;
      anchor = baseAnchor;
    }

    // The signature's opening gap, as a fraction of the price.
    let forcedGap: number | null = null;
    if (role === 'breakout' && rngs.signatures.chance(sig.breakout.gapChance)) {
      forcedGap = draw(sig.breakout.gap);
    } else if (role === 'breakdown' && rngs.signatures.chance(sig.breakdown.gapChance)) {
      forcedGap = -draw(sig.breakdown.gap);
    }

    // Draft the week, in log terms.
    let logClose = Math.log(close);
    for (let k = 0; k < BARS_PER_WEEK; k++) {
      const i = w * BARS_PER_WEEK + k;
      const slot = k % BARS_PER_SESSION;
      const clusterVol = Math.sqrt(h);

      let gap = 0;
      if (slot === 0 && i > 0) {
        gap = normal() * p.overnightGap * sessionVol * sp.vol * clusterVol;
        if (k === 0 && forcedGap != null) gap = Math.log(1 + forcedGap);
        idio += gap;
      }
      const z = studentT(p.shockDf);
      const sigma = barVol * sp.vol * clusterVol * (volU[slot] ?? 1);
      const move = drift / BARS_PER_WEEK + meanReversion * (anchor - idio) + z * sigma;
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
      gapOf[k] = totalGap;
      moveOf[k] = totalMove;
      sigmaOf[k] = sigma;
      volumeOf[k] =
        spec.baseVolume *
        sp.volume *
        ((p.intradayVolume[slot] ?? 1) / volumeMean) *
        (1 + p.volumeShock * (Math.abs(z) - 0.8)) *
        Math.exp(normal() * p.volumeNoise);
      logClose += totalGap + totalMove;
    }

    // Close past the level: tilt the week's moves evenly.
    let target: number | null = null;
    if (role === 'breakout' && Number.isFinite(baseHigh)) {
      target = Math.max(logClose, Math.log(baseHigh * (1 + draw(sig.breakout.clearance))));
    } else if (role === 'failedLast' && Number.isFinite(baseHigh)) {
      target = Math.min(logClose, Math.log(baseHigh * (1 - draw(sig.failedBreakout.clearance))));
    } else if (role === 'breakdown') {
      const support = stages[w - 1] === 3 ? topLow : baseLow;
      if (Number.isFinite(support)) {
        target = Math.min(logClose, Math.log(support * (1 - draw(sig.breakdown.clearance))));
      }
    }
    if (target != null && target !== logClose) {
      const tilt = (target - logClose) / BARS_PER_WEEK;
      for (let k = 0; k < BARS_PER_WEEK; k++) moveOf[k] = (moveOf[k] ?? 0) + tilt;
      idio += target - logClose;
    }

    // Volume: the signature's multiple of the previous 10 weeks' average.
    const ratio =
      role === 'breakout'
        ? sig.breakout.volume
        : role === 'followThrough'
          ? sig.breakout.followVolume
          : role === 'failing' || role === 'failedLast'
            ? sig.failedBreakout.volume
            : role === 'breakdown'
              ? sig.breakdown.volume
              : null;
    let volumeScale = 1;
    if (ratio != null && weekVolumes.length > 0) {
      const recent = weekVolumes.slice(-10);
      const avg = recent.reduce((a, v) => a + v, 0) / recent.length;
      const raw = volumeOf.reduce((a, v) => a + v, 0);
      volumeScale = (draw(ratio) * avg) / raw;
    }

    let weekVolume = 0;
    for (let k = 0; k < BARS_PER_WEEK; k++) {
      const totalGap = gapOf[k] ?? 0;
      const totalMove = moveOf[k] ?? 0;
      gaps.push(totalGap);
      moves.push(totalMove);
      const sigma = sigmaOf[k] ?? 0;
      const open = close * Math.exp(totalGap);
      const next = open * Math.exp(totalMove);
      const o = cents(open);
      const c = cents(next);
      const high = Math.max(open, next) * Math.exp(Math.abs(normal()) * sigma * p.wick);
      const low = Math.min(open, next) * Math.exp(-Math.abs(normal()) * sigma * p.wick);
      const v = Math.max(1, Math.round((volumeOf[k] ?? 0) * volumeScale));
      weekVolume += v;
      bars.push({ o, h: Math.max(o, c, cents(high)), l: Math.min(o, c, cents(low)), c, v });
      close = next;
    }
    weekVolumes.push(weekVolume);

    // The levels, on the week's close as the chart shows it.
    const weekClose = cents(close);
    if (stage === 1) {
      baseHigh = Math.max(baseHigh, weekClose);
      baseLow = Math.min(baseLow, weekClose);
    } else if (stage === 3) {
      topLow = Math.min(topLow, weekClose);
    }
  }
  return { bars, moves: { gaps, moves } };
}
