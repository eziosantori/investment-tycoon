import { STAGE_LABELS, stageBands } from '../../../engine/chart/stageBands';
import type { Stage } from '../../../engine/market/types';
import s from './stageBands.module.css';

/**
 * Hidden-stage bands drawn behind a chart (dev overlay, gallery): one
 * full-height rect per run of weeks in the same stage, in the `--stage-N`
 * colors, with a "1 BASE"-style label when the band is wide enough.
 * Renders an SVG `<g>`: put it first in the chart's `<svg>`.
 */
interface Props {
  /** The visible window, oldest first: stages, or bars carrying their stage. */
  window: readonly (Stage | { stage: Stage })[];
  /** Left edge (px) of the first bar's slot. */
  x0: number;
  /** Width (px) of one bar slot. */
  slotWidth: number;
  top: number;
  bottom: number;
  /** Draw the stage labels (default true). */
  labels?: boolean;
}

/** Narrowest band (px) that still gets a label. */
const LABEL_MIN_WIDTH = 44;

export function StageBands({ window, x0, slotWidth, top, bottom, labels = true }: Props) {
  return (
    <g aria-hidden="true">
      {stageBands(window).map((band) => {
        const x = x0 + band.from * slotWidth;
        const width = (band.to - band.from) * slotWidth;
        return (
          <g key={band.from}>
            <rect
              x={x}
              y={top}
              width={width}
              height={Math.max(0, bottom - top)}
              fill={`var(--stage-${band.stage})`}
            />
            {labels && width >= LABEL_MIN_WIDTH && (
              <text x={x + 6} y={top + 14} className={s.label}>
                {STAGE_LABELS[band.stage]}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
