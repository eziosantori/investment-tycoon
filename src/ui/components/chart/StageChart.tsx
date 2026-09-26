import { useId, type ReactNode } from 'react';
import type { WeeklyStudyBar } from '../../../engine/market/types';
import { MINUS } from '../../format';
import { useElementSize } from '../../hooks/useElementSize';
import { linear, ticks } from './scale';

export interface ChartPosition {
  entryIndex: number;
  entry: number;
  stop: number | null;
  target: number;
}

export interface StudyToggles {
  ma: boolean;
  vol: boolean;
  rs: boolean;
}

interface Props {
  bars: readonly WeeklyStudyBar[];
  position?: ChartPosition | undefined;
  show: StudyToggles;
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

export function StageChart({ bars, position, show }: Props) {
  const [ref, { width, height }] = useElementSize<HTMLDivElement>();
  const clipId = useId();

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {width > 0 && height > 0 && (
        <svg
          width={width}
          height={height}
          style={{ display: 'block' }}
          role="img"
          aria-label="Weekly price chart with 30 and 10 week moving averages, volume and relative strength"
        >
          {renderChart({ bars, position, show, width, height, clipId })}
        </svg>
      )}
    </div>
  );
}

function renderChart({
  bars,
  position,
  show,
  width: W,
  height: H,
  clipId,
}: Props & { width: number; height: number; clipId: string }): ReactNode[] {
  const k: ReactNode[] = [];
  const last = bars[bars.length - 1];
  if (!last) return k;

  // Pane layout: price always, volume and RS optional; spare space goes to price.
  const weights = WEIGHT.price + (show.vol ? WEIGHT.vol : 0) + (show.rs ? WEIGHT.rs : 0);
  const gaps = (show.vol ? PANE_GAP : 0) + (show.rs ? PANE_GAP : 0);
  const unit = (H - PAD_TOP - PAD_BOTTOM - gaps) / weights;
  const pT = PAD_TOP;
  const pB = pT + WEIGHT.price * unit;
  const vT = pB + PANE_GAP;
  const vB = show.vol ? vT + WEIGHT.vol * unit : pB;
  const rT = (show.vol ? vB : pB) + PANE_GAP;
  const rB = rT + WEIGHT.rs * unit;
  const plotR = W - PAD_R;

  // X axis
  const slots = bars.length + RIGHT_SLOTS;
  const bw = (plotR - PAD_L - 10) / slots;
  const xOf = (i: number) => PAD_L + (i + 0.5) * bw;

  // Price scale
  const priceVals = bars.flatMap((b) => [
    b.h,
    b.l,
    ...(show.ma ? [b.ma10 ?? b.c, b.ma30 ?? b.c] : []),
  ]);
  if (position) priceVals.push(position.target, position.stop ?? position.entry);
  const lo = Math.min(...priceVals);
  const hi = Math.max(...priceVals);
  const padP = (hi - lo) * 0.06;
  const y = linear(lo - padP, hi + padP, pB, pT);

  for (const p of ticks(lo - padP, hi + padP, 6)) {
    k.push(<line key={`g${p}`} x1={0} x2={plotR} y1={y(p)} y2={y(p)} stroke="var(--grid)" />);
    k.push(
      <text key={`gt${p}`} x={plotR + 8} y={y(p) + 4} {...AXIS_TEXT}>
        {p.toFixed(p < 10 ? 1 : 0)}
      </text>,
    );
  }
  k.push(<line key="sep-p" x1={0} x2={W} y1={pB + 4} y2={pB + 4} stroke="var(--divider)" />);

  const up = 'var(--up)';
  const dn = 'var(--down)';
  const entryIdx = position?.entryIndex ?? -1;

  // Position zones (under the candles)
  if (position) {
    const ex = xOf(position.entryIndex);
    k.push(
      <rect
        key="zone-up"
        x={ex}
        y={y(position.target)}
        width={plotR - ex}
        height={Math.max(0, y(position.entry) - y(position.target))}
        fill={up}
        opacity={0.07}
      />,
    );
    if (position.stop != null) {
      k.push(
        <rect
          key="zone-dn"
          x={ex}
          y={y(position.entry)}
          width={plotR - ex}
          height={Math.max(0, y(position.stop) - y(position.entry))}
          fill={dn}
          opacity={0.09}
        />,
      );
    }
  }

  // Candles
  bars.forEach((b, i) => {
    const x = xOf(i);
    const col = b.c >= b.o ? up : dn;
    const yt = y(Math.max(b.o, b.c));
    const yb = y(Math.min(b.o, b.c));
    k.push(<line key={`w${i}`} x1={x} x2={x} y1={y(b.h)} y2={y(b.l)} stroke={col} />);
    k.push(
      <rect
        key={`b${i}`}
        x={x - bw * 0.34}
        y={yt}
        width={bw * 0.68}
        height={Math.max(1, yb - yt)}
        fill={col}
        rx={0.5}
      />,
    );
  });

  const path = (vals: (number | null)[], sy: (v: number) => number) => {
    let d = '';
    vals.forEach((v, i) => {
      if (v == null) return;
      d += `${d ? 'L' : 'M'}${xOf(i).toFixed(1)} ${sy(v).toFixed(1)}`;
    });
    return d;
  };

  if (show.ma) {
    const ma30 = path(
      bars.map((b) => b.ma30),
      y,
    );
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
    k.push(<path key="ma30" d={ma30} fill="none" stroke="var(--ma30)" strokeWidth={2.25} />);
  }

  // Volume pane
  if (show.vol) {
    const vMax = Math.max(...bars.map((b) => b.v)) * 1.05;
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
          fill={b.c >= b.o ? up : dn}
          opacity={i === entryIdx ? 1 : 0.3}
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
    const eb = bars[entryIdx];
    if (eb?.avgVol10) {
      const ratio = eb.v / eb.avgVol10;
      const bx = xOf(entryIdx) - 38;
      k.push(
        <rect
          key="vxb"
          x={bx}
          y={yv(eb.v) - 2}
          width={32}
          height={14}
          rx={3}
          fill="var(--reward)"
        />,
      );
      k.push(
        <text
          key="vx"
          x={bx + 16}
          y={yv(eb.v) + 9}
          {...AXIS_TEXT}
          fill="#1A1400"
          fontWeight={700}
          textAnchor="middle"
        >
          {ratio.toFixed(1)}×
        </text>,
      );
    }
    k.push(<line key="sep-v" x1={0} x2={W} y1={vB + 5} y2={vB + 5} stroke="var(--divider)" />);
  }

  // Relative strength pane
  if (show.rs) {
    const rsVals = bars.map((b) => b.rs).filter((v): v is number => v != null);
    const rMax = Math.max(1, ...rsVals) * 1.15;
    const rMin = Math.min(-1, ...rsVals) * 1.15;
    const yr = linear(rMin, rMax, rB, rT);
    const zero = yr(0);
    const rsPath = path(
      bars.map((b) => b.rs),
      yr,
    );
    const firstRs = bars.findIndex((b) => b.rs != null);
    const area = `${rsPath} L${xOf(bars.length - 1)} ${zero} L${xOf(Math.max(0, firstRs))} ${zero} Z`;

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
    if (last.rs != null) {
      const ty = Math.min(rB - 16, Math.max(rT, yr(last.rs) - 8));
      k.push(
        <rect
          key="rsr"
          x={plotR + 2}
          y={ty}
          width={PAD_R - 6}
          height={16}
          rx={3}
          fill={last.rs >= 0 ? up : 'var(--risk-1)'}
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
          {fmtRs(last.rs)}
        </text>,
      );
    }
  }

  // Position: stop/target tags and entry marker
  if (position) {
    const ex = xOf(position.entryIndex);
    const tag = (key: string, p: number, fill: string, text: string, w: number) => {
      const yy = y(p);
      const lx = plotR - w - 4;
      k.push(
        <line
          key={`${key}-l`}
          x1={ex}
          x2={plotR}
          y1={yy}
          y2={yy}
          stroke={fill}
          strokeDasharray="5 3"
          strokeWidth={1.25}
        />,
      );
      k.push(<rect key={`${key}-r`} x={lx} y={yy - 10} width={w} height={20} rx={4} fill={fill} />);
      k.push(
        <text
          key={`${key}-t`}
          x={lx + w / 2}
          y={yy + 4}
          fill="var(--text-on-accent)"
          fontSize={11}
          fontWeight={700}
          fontFamily="var(--font-display)"
          textAnchor="middle"
          letterSpacing=".04em"
        >
          {text}
        </text>,
      );
    };
    tag('tp', position.target, up, `★ TARGET ${position.target.toFixed(2)} · +2R`, 150);
    if (position.stop != null) {
      tag('sl', position.stop, dn, `⛨ STOP ${position.stop.toFixed(2)} · ${MINUS}1R`, 138);
    }
    const eb = bars[position.entryIndex];
    if (eb) {
      const my = y(eb.l);
      k.push(<circle key="mk-halo" cx={ex} cy={my + 14} r={10} fill={up} opacity={0.2} />);
      k.push(<path key="mk" d={`M${ex} ${my + 7} l-6 10 h12 z`} fill={up} />);
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
      fill={last.c >= last.o ? up : dn}
    />,
  );
  k.push(
    <text key="lpt" x={plotR + 8} y={ly + 4} {...AXIS_TEXT} fill="var(--up-ink)" fontWeight={700}>
      {last.c.toFixed(2)}
    </text>,
  );

  return k;
}
