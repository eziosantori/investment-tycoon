import { useId, type ReactNode } from 'react';
import type { ChartBar, ChartView } from '../../../engine/chart/view';
import { MINUS } from '../../format';
import { useElementSize } from '../../hooks/useElementSize';
import { linear, ticks } from './scale';
import { StageBands } from './StageBands';
import { useStageBands } from './stageBandsContext';

/**
 * Renders a chart view (engine/chart/view.ts). Draws only what `view.layers`
 * enables; panes that are off are removed and the price pane takes their height.
 * Prices arrive in integer cents.
 */
interface Props {
  view: ChartView;
  /** Draw the hidden-stage bands (dev only). Defaults to `StageBandsContext`. */
  bands?: boolean;
}

const PAD_R = 66;
const PAD_L = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 22;
const PANE_GAP = 10;
/** Relative pane heights, from the design's 452px chart body. */
const WEIGHT = { price: 254, vol: 58, rs: 80 };
/** Empty slots to the right of the last bar, for tags and breathing room. */
const RIGHT_SLOTS = 6;

const AXIS_TEXT = {
  fill: 'var(--text-axis)',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
} as const;

const PANE_LABEL = {
  fill: 'var(--text-axis)',
  fontSize: 10,
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  letterSpacing: '.1em',
} as const;

const fmtRs = (v: number) => `${v < 0 ? MINUS : ''}${Math.abs(v).toFixed(1)}`;
const dollars = (cents: number) => cents / 100;

export function StageChart({ view, bands }: Props) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const clipId = useId();
  const bandsFromContext = useStageBands();

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {width > 0 && height > 0 && (
        <svg
          width={width}
          height={height}
          style={{ display: 'block' }}
          role="img"
          aria-label={`${view.instrument.ticker} ${view.timeframe} price chart`}
        >
          {renderChart({ view, bands: bands ?? bandsFromContext, width, height, clipId })}
        </svg>
      )}
    </div>
  );
}

function renderChart({
  view,
  bands,
  width: W,
  height: H,
  clipId,
}: Props & { width: number; height: number; clipId: string }): ReactNode[] {
  const k: ReactNode[] = [];
  const { bars, layers } = view;
  const last = bars[bars.length - 1];
  if (!last) return k;

  // Pane layout: price always, volume and RS optional; spare space goes to price.
  const showVol = layers.volume;
  const showRs = layers.rs;
  const weights = WEIGHT.price + (showVol ? WEIGHT.vol : 0) + (showRs ? WEIGHT.rs : 0);
  const gaps = (showVol ? PANE_GAP : 0) + (showRs ? PANE_GAP : 0);
  const unit = (H - PAD_TOP - PAD_BOTTOM - gaps) / weights;
  const pT = PAD_TOP;
  const pB = pT + WEIGHT.price * unit;
  const vT = pB + PANE_GAP;
  const vB = showVol ? vT + WEIGHT.vol * unit : pB;
  const rT = (showVol ? vB : pB) + PANE_GAP;
  const rB = rT + WEIGHT.rs * unit;
  const plotR = W - PAD_R;

  // X axis
  const slots = bars.length + RIGHT_SLOTS;
  const bw = (plotR - PAD_L - 10) / slots;
  const xOf = (i: number) => PAD_L + (i + 0.5) * bw;

  if (bands) {
    k.push(<StageBands key="bands" window={bars} x0={PAD_L} slotWidth={bw} top={0} bottom={H} />);
  }

  // Price scale
  const candles = layers.price === 'candles';
  const priceVals = bars.flatMap((b) => [
    ...(candles ? [b.h, b.l] : [b.c]),
    ...(layers.ma10 && b.ma10 != null ? [b.ma10] : []),
    ...(layers.ma30 && b.ma30 != null ? [b.ma30] : []),
  ]);
  const lo = Math.min(...priceVals);
  const hi = Math.max(...priceVals);
  const padP = Math.max(1, (hi - lo) * 0.06);
  const y = linear(lo - padP, hi + padP, pB, pT);

  for (const p of ticks(dollars(lo - padP), dollars(hi + padP), 6)) {
    const yy = y(p * 100);
    k.push(<line key={`g${p}`} x1={0} x2={plotR} y1={yy} y2={yy} stroke="var(--grid)" />);
    k.push(
      <text key={`gt${p}`} x={plotR + 8} y={yy + 4} {...AXIS_TEXT}>
        {p.toFixed(p < 10 ? 1 : 0)}
      </text>,
    );
  }
  k.push(<line key="sep-p" x1={0} x2={W} y1={pB + 4} y2={pB + 4} stroke="var(--divider)" />);

  const up = 'var(--up)';
  const dn = 'var(--down)';
  const colorOf = (b: ChartBar) => (b.c >= b.o ? up : dn);

  const path = (vals: (number | null)[], sy: (v: number) => number) => {
    let d = '';
    vals.forEach((v, i) => {
      if (v == null) return;
      d += `${d ? 'L' : 'M'}${xOf(i).toFixed(1)} ${sy(v).toFixed(1)}`;
    });
    return d;
  };

  if (candles) {
    bars.forEach((b, i) => {
      const x = xOf(i);
      const col = colorOf(b);
      const yt = y(Math.max(b.o, b.c));
      const yb = y(Math.min(b.o, b.c));
      const op = b.forming ? 0.6 : 1;
      k.push(
        <line key={`w${i}`} x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} stroke={col} opacity={op} />,
      );
      k.push(
        <rect
          key={`b${i}`}
          x={x - bw * 0.34}
          y={yt}
          width={bw * 0.68}
          height={Math.max(1, yb - yt)}
          fill={col}
          opacity={op}
          rx={0.5}
        />,
      );
    });
  } else {
    // Price line (Lv1–3), as on the Rookie board: area fill, soft glow, last-point dot.
    const line = path(
      bars.map((b) => b.c),
      y,
    );
    const areaId = `${clipId}-area`;
    k.push(
      <defs key="price-defs">
        <linearGradient id={areaId} x1={0} y1={0} x2={0} y2={1}>
          <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
        </linearGradient>
      </defs>,
    );
    k.push(
      <path
        key="price-area"
        d={`${line} L${xOf(bars.length - 1)} ${pB} L${xOf(0)} ${pB} Z`}
        fill={`url(#${areaId})`}
      />,
    );
    k.push(
      <path
        key="price-glow"
        d={line}
        fill="none"
        stroke="var(--accent-light)"
        strokeWidth={6}
        opacity={0.12}
        strokeLinejoin="round"
      />,
    );
    k.push(
      <path
        key="price"
        d={line}
        fill="none"
        stroke="var(--text)"
        strokeWidth={2}
        strokeLinejoin="round"
      />,
    );
    k.push(<circle key="now" cx={xOf(bars.length - 1)} cy={y(last.c)} r={4} fill="var(--text)" />);
  }

  if (layers.ma10) {
    k.push(
      <path
        key="ma10"
        d={path(
          bars.map((b) => b.ma10),
          y,
        )}
        fill="none"
        stroke="var(--ma10)"
        strokeWidth={1.25}
      />,
    );
  }
  if (layers.ma30) {
    const ma30 = path(
      bars.map((b) => b.ma30),
      y,
    );
    k.push(
      <path
        key="ma30g"
        d={ma30}
        fill="none"
        stroke="var(--accent-light)"
        strokeWidth={6}
        opacity={0.12}
      />,
    );
    // Over a white price line (Lv2–3) the MA takes the accent so the two stay apart.
    const ma30Color = candles ? 'var(--ma30)' : 'var(--accent-light)';
    k.push(<path key="ma30" d={ma30} fill="none" stroke={ma30Color} strokeWidth={2.25} />);
  }

  // Volume pane
  if (showVol) {
    const vMax = Math.max(1, ...bars.map((b) => b.v)) * 1.05;
    const yv = linear(0, vMax, vB, vT);
    k.push(
      <text key="vl" x={10} y={vT + 10} {...PANE_LABEL}>
        VOLUME
      </text>,
    );
    bars.forEach((b, i) => {
      const x = xOf(i);
      k.push(
        <rect
          key={`v${i}`}
          x={x - bw * 0.34}
          y={yv(b.v)}
          width={bw * 0.68}
          height={vB - yv(b.v)}
          fill={colorOf(b)}
          opacity={0.3}
        />,
      );
    });
    k.push(
      <path
        key="avgv"
        d={path(
          bars.map((b) => b.avgVol10),
          yv,
        )}
        fill="none"
        stroke="var(--avg-vol)"
        strokeWidth={1}
        strokeDasharray="3 2"
      />,
    );
    k.push(<line key="sep-v" x1={0} x2={W} y1={vB + 5} y2={vB + 5} stroke="var(--divider)" />);
  }

  // Relative strength pane
  if (showRs) {
    const rsVals = bars.map((b) => b.rs).filter((v): v is number => v != null);
    const rMax = Math.max(1, ...rsVals) * 1.15;
    const rMin = Math.min(-1, ...rsVals) * 1.15;
    const yr = linear(rMin, rMax, rB, rT);
    const zero = yr(0);
    const rsSeries = bars.map((b) => b.rs);
    const rsPath = path(rsSeries, yr);
    const firstRs = rsSeries.findIndex((v) => v != null);
    const lastRsIdx = rsSeries.findLastIndex((v) => v != null);
    const lastRs = rsSeries[lastRsIdx] ?? null;
    const area = `${rsPath} L${xOf(Math.max(0, lastRsIdx))} ${zero} L${xOf(Math.max(0, firstRs))} ${zero} Z`;

    k.push(
      <text key="rl" x={10} y={rT + 10} {...PANE_LABEL}>
        RELATIVE STRENGTH vs MARKET
      </text>,
    );
    k.push(
      <defs key="rs-defs">
        <clipPath id={`${clipId}-above`}>
          <rect x={0} y={rT} width={W} height={Math.max(0, zero - rT)} />
        </clipPath>
        <clipPath id={`${clipId}-below`}>
          <rect x={0} y={zero} width={W} height={Math.max(0, rB - zero)} />
        </clipPath>
      </defs>,
    );
    k.push(
      <path key="rsa-up" d={area} fill={up} opacity={0.08} clipPath={`url(#${clipId}-above)`} />,
    );
    k.push(
      <path key="rsa-dn" d={area} fill={dn} opacity={0.08} clipPath={`url(#${clipId}-below)`} />,
    );
    k.push(
      <line
        key="r0"
        x1={0}
        x2={plotR}
        y1={zero}
        y2={zero}
        stroke="var(--rs-zero)"
        strokeDasharray="4 3"
      />,
    );
    k.push(
      <text key="r0t" x={plotR + 8} y={zero + 4} {...AXIS_TEXT}>
        0
      </text>,
    );
    k.push(<path key="rs" d={rsPath} fill="none" stroke="var(--rs-line)" strokeWidth={1.5} />);
    if (lastRs != null) {
      const ty = Math.min(rB - 16, Math.max(rT, yr(lastRs) - 8));
      k.push(
        <rect
          key="rsr"
          x={plotR + 2}
          y={ty}
          width={PAD_R - 6}
          height={16}
          rx={3}
          fill={lastRs >= 0 ? up : 'var(--risk-1)'}
        />,
      );
      k.push(
        <text
          key="rst"
          x={plotR + 8}
          y={ty + 12}
          {...AXIS_TEXT}
          fill="var(--text-on-accent)"
          fontWeight={700}
        >
          {fmtRs(lastRs)}
        </text>,
      );
    }
  }

  // Last price tag
  const ly = y(last.c);
  k.push(
    <rect
      key="lp"
      x={plotR + 2}
      y={ly - 9}
      width={PAD_R - 6}
      height={18}
      rx={3}
      fill={colorOf(last)}
    />,
  );
  k.push(
    <text key="lpt" x={plotR + 8} y={ly + 4} {...AXIS_TEXT} fill="var(--up-ink)" fontWeight={700}>
      {dollars(last.c).toFixed(2)}
    </text>,
  );

  return k;
}
