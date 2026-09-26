import type { CSSProperties } from 'react';

interface Props {
  /** Filled fraction, 0–1. */
  value: number;
  color: string;
  track: string;
  segments?: number;
  glow?: boolean;
  /** Gold ★ on the last segment (mission target). */
  star?: boolean;
  className?: string | undefined;
  label: string;
}

/**
 * The segmented bar used for the mission, HP and risk meters. Segments fill in
 * order; the partial one uses a hard-stop gradient, as in the design.
 */
export function SegmentBar({
  value,
  color,
  track,
  segments = 10,
  glow = false,
  star = false,
  className,
  label,
}: Props) {
  const filled = Math.min(1, Math.max(0, value)) * segments;
  return (
    <div
      className={className}
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${segments}, 1fr)`,
        gap: 3,
        height: 14,
      }}
    >
      {Array.from({ length: segments }, (_, i) => {
        const fill = Math.min(1, Math.max(0, filled - i));
        const style: CSSProperties = { borderRadius: 2 };
        if (fill >= 1) {
          style.background = color;
          if (glow) style.boxShadow = `0 0 8px color-mix(in oklab, ${color} 60%, transparent)`;
        } else if (fill > 0) {
          const pct = Math.round(fill * 100);
          style.background = `linear-gradient(90deg, ${color} ${pct}%, ${track} ${pct}%)`;
        } else {
          style.background = track;
        }
        const isStar = star && i === segments - 1;
        if (isStar) {
          Object.assign(style, {
            display: 'grid',
            placeItems: 'center',
            fontSize: 9,
            color: 'var(--reward)',
          });
        }
        return (
          <div key={i} style={style}>
            {isStar ? '★' : null}
          </div>
        );
      })}
    </div>
  );
}
